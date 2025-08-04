const validateScanRequest = (req, res, next) => {
  const { name, uri, method, headers, body_template, response_field } = req.body;
  
  const errors = [];
  
  if (!name || typeof name !== 'string') {
    errors.push('name is required and must be a string');
  }
  
  if (!uri || typeof uri !== 'string') {
    errors.push('uri is required and must be a string');
  }
  
  if (!method || !['GET', 'POST'].includes(method.toUpperCase())) {
    errors.push('method is required and must be GET or POST');
  }
  
  if (!headers || typeof headers !== 'object') {
    errors.push('headers is required and must be an object');
  }
  
  if (!body_template || typeof body_template !== 'object') {
    errors.push('body_template is required and must be an object');
  } else {
    const templateStr = JSON.stringify(body_template);
    if (!templateStr.includes('$INPUT')) {
      errors.push('body_template must contain $INPUT placeholder');
    }
  }
  
  if (!response_field || typeof response_field !== 'string') {
    errors.push('response_field is required and must be a string');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

export { validateScanRequest };
