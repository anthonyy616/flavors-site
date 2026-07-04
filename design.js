// Handles cake design preview with Google Gemini API

async function generateCakePreview() {
  // Capture values from preview spans
  const size = document.getElementById('preview-size').innerText.trim() || '6"'; // Default if empty
  const color = document.getElementById('preview-color').innerText.trim() || 'white';
  const flavor = document.getElementById('preview-flavor').innerText.trim() || 'vanilla';
  const icing = document.getElementById('preview-icing').innerText.trim() || 'none';
  const decorations = document.getElementById('preview-decorations').innerText.trim() || 'none';
  
  // Build prompt for AI, including all details for better accuracy
  const prompt = `A detailed, appetizing ${size} ${flavor} cake with ${color} color, ${icing} icing, and ${decorations} decorations, high resolution, realistic style`;
  
  // The rest of the function remains the same (API key, fetch call, etc.)
  const apiKey = 'AIzaSyCGLeHRW6cATrp3-5M3Oqw24WCVfcwV2Yw';
  
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    const base64Image = data.candidates[0].content.parts[0].inlineData.data;
    const mimeType = data.candidates[0].content.parts[0].inlineData.mimeType;
    const imageUrl = `data:${mimeType};base64,${base64Image}`;
    
    const previewImg = document.getElementById('cake-preview-img');
    previewImg.src = imageUrl;
    previewImg.alt = 'Generated cake preview';
    previewImg.style.display = 'block';
    
  } catch (error) {
    console.error('Error generating image:', error);
    alert('Failed to generate preview. Check console for details.');
  }
}


document.getElementById('generate-preview-btn').addEventListener('click', generateCakePreview);