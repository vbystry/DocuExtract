const analyzeFile = async (file) => {
  setIsLoading(true);
  setError(null);
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/analyze-csv', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to analyze file');
    }
    
    setAnalysisData(data);
  } catch (error) {
    setError(error.message);
  } finally {
    setIsLoading(false);
  }
}; 