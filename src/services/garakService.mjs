import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GarakService {
  constructor() {
    this.configDir = path.join(__dirname, '../../config');
    this.tempDir = path.join(__dirname, '../../temp');
    this.logsDir = path.join(__dirname, '../../logs');
  }

  async runScan(scanId, scanConfig) {
    const outputPath = path.join(this.tempDir, `${scanId}_output.json`);
    const optionsPath = path.join(this.configDir, `${scanId}_generator_options.json`);
    
    try {
      await this.executeGarak(null, outputPath, scanId, scanConfig);
      const result = await this.parseResults(outputPath);
      
      await this.cleanup(optionsPath, outputPath);
      
      return result;
    } catch (error) {
      await this.cleanup(optionsPath, outputPath);
      throw error;
    }
  }

  async generateGarakConfig(scanId, config) {
    const {
      name,
      uri,
      method,
      headers,
      body_template,
      response_field,
      api_key,
      probes,
      detectors
    } = config;

    const finalHeaders = { ...headers };
    if (api_key) {
      finalHeaders['Authorization'] = `Bearer ${api_key}`;
    }

    const garakConfig = {
      _config: {
        plugins: {
          generators: {
            "rest.RestGenerator": {
              uri: uri,
              name: name || `rest_${scanId}`,
              method: method.toLowerCase(),
              headers: finalHeaders,
              req_template_json_object: body_template,
              response_json: true,
              response_json_field: response_field,
              request_timeout: 30
            }
          }
        }
      }
    };

    const configPath = path.join(this.configDir, `${scanId}_config.yaml`);
    const yamlContent = this.convertToYaml(garakConfig);
    
    await fs.writeFile(configPath, yamlContent, 'utf8');
    
    return configPath;
  }

  convertToYaml(obj, indent = 0) {
    let yaml = '';
    const spaces = '  '.repeat(indent);
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        yaml += this.convertToYaml(value, indent + 1);
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        for (const item of value) {
          yaml += `${spaces}  - ${item}\n`;
        }
      } else {
        const valueStr = typeof value === 'string' ? `"${value}"` : value;
        yaml += `${spaces}${key}: ${valueStr}\n`;
      }
    }
    
    return yaml;
  }

  async executeGarak(configPath, outputPath, scanId, scanConfig) {
    return new Promise(async (resolve, reject) => {
      const logPath = path.join(this.logsDir, `${scanId}_garak.log`);
      
      const finalHeaders = { ...scanConfig.headers };
      if (scanConfig.api_key) {
        finalHeaders['Authorization'] = `Bearer ${scanConfig.api_key}`;
      }

      // Create generator options JSON file with correct nested structure
      const generatorOptions = {
        rest: {
          RestGenerator: {
            uri: scanConfig.uri,
            method: scanConfig.method.toLowerCase(),
            headers: finalHeaders,
            req_template_json_object: scanConfig.body_template,
            response_json: true,
            response_json_field: scanConfig.response_field.startsWith('$') ? scanConfig.response_field : `$.${scanConfig.response_field}`,
            request_timeout: 30
          }
        }
      };

      const optionsPath = path.join(this.configDir, `${scanId}_generator_options.json`);
      
      try {
        await fs.writeFile(optionsPath, JSON.stringify(generatorOptions, null, 2), 'utf8');
      } catch (error) {
        reject(new Error(`Failed to write generator options file: ${error.message}`));
        return;
      }

      const args = [
        '-m', 'garak',
        '--model_type', 'rest',
        '--generator_option_file', optionsPath,
        '--report_prefix', outputPath.replace('.json', ''),
        '--verbose'
      ];

      if (scanConfig.probes && scanConfig.probes.length > 0) {
        args.push('--probes', scanConfig.probes.join(','));
      } else {
        // Use a fast probe for testing if none specified
        args.push('--probes', 'goodside.Tag');
      }

      if (scanConfig.detectors && scanConfig.detectors.length > 0) {
        args.push('--detectors', scanConfig.detectors.join(','));
      }

      console.log(`Executing Garak with args: python ${args.join(' ')}`);
      
      const garakProcess = spawn('python3', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';

      garakProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log(`Garak stdout: ${data}`);
      });

      garakProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error(`Garak stderr: ${data}`);
      });

      garakProcess.on('close', async (code) => {
        try {
          await fs.writeFile(logPath, `STDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n\nExit Code: ${code}`);
        } catch (logError) {
          console.error('Failed to write log file:', logError);
        }

        if (code === 0) {
          console.log(`Garak scan ${scanId} completed successfully`);
          resolve();
        } else {
          console.error(`Garak scan ${scanId} failed with exit code ${code}`);
          reject(new Error(`Garak execution failed with exit code ${code}. Check logs at ${logPath}`));
        }
      });

      garakProcess.on('error', (error) => {
        console.error(`Failed to start Garak process: ${error}`);
        reject(new Error(`Failed to start Garak: ${error.message}`));
      });
    });
  }

  async parseResults(outputPath) {
    try {
      // Garak writes reports to the temp directory when using --report_prefix
      const outputDir = path.dirname(outputPath);
      const reportPrefix = path.basename(outputPath, '.json');
      
      const files = await fs.readdir(outputDir);
      const reportFiles = files.filter(f => f.includes(reportPrefix) && f.endsWith('.report.jsonl'));
      
      if (reportFiles.length === 0) {
        throw new Error(`No Garak report files found in ${outputDir} with prefix ${reportPrefix}`);
      }

      const reportPath = path.join(outputDir, reportFiles[0]);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      
      // Parse JSONL format - each line is a JSON object
      const lines = reportContent.trim().split('\n');
      const results = lines.map(line => JSON.parse(line));
      
      return {
        scan_summary: {
          total_attempts: results.length,
          passed: results.filter(r => r.passed).length,
          failed: results.filter(r => !r.passed).length
        },
        detailed_results: results
      };
    } catch (error) {
      console.error('Failed to parse Garak results:', error);
      throw new Error(`Failed to parse scan results: ${error.message}`);
    }
  }

  async cleanup(configPath, outputPath) {
    try {
      if (configPath) {
        await fs.unlink(configPath).catch(() => {});
      }
      
      // Clean up temp directory files
      const outputDir = path.dirname(outputPath);
      const outputBasename = path.basename(outputPath, '.json');
      const files = await fs.readdir(outputDir).catch(() => []);
      
      for (const file of files) {
        if (file.includes(outputBasename)) {
          await fs.unlink(path.join(outputDir, file)).catch(() => {});
        }
      }
      
      // Clean up Garak report files
      const garakRunsDir = path.join(process.env.HOME, '.local/share/garak/garak_runs');
      const garakFiles = await fs.readdir(garakRunsDir).catch(() => []);
      
      for (const file of garakFiles) {
        if (file.includes(outputBasename)) {
          await fs.unlink(path.join(garakRunsDir, file)).catch(() => {});
        }
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}
