// design.js — calls the Supabase Edge Function, never talks to fal.ai or any
// model provider directly from the browser.

const PREVIEW_FUNCTION_URL =
  `${window.env.SUPABASE_URL}/functions/v1/generate-cake-preview`;

async function generateCakePreview() {
  const btn = document.getElementById('generate-preview-btn');
  const originalBtnHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span class="sym">hourglass_top</span> Generating...`;

  const size = document.getElementById('preview-size').innerText.trim() || '6';
  const color = document.getElementById('preview-color').innerText.trim();
  const flavor = document.getElementById('preview-flavor').innerText.trim();
  const icing = document.getElementById('preview-icing').innerText.trim().toLowerCase() === 'yes' ? 'yes' : 'no';
  const decorations = document.getElementById('preview-decorations').innerText.trim();

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const headers = { 'Content-Type': 'application/json' };
    if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

    const response = await fetch(PREVIEW_FUNCTION_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        size: size.replace('"', ''),
        color,
        flavor,
        icing,
        decorations
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Preview generation failed');
    }

    const previewImg = document.getElementById('cake-preview-img');
    previewImg.src = data.image_url;
    previewImg.alt = 'Generated cake preview';
    previewImg.style.display = 'block';
    document.getElementById('cake-preview-placeholder').style.display = 'none';

  } catch (error) {
    console.error('Error generating preview:', error);
    alert(error.message === 'Preview limit reached. Please try again later.'
      ? error.message
      : 'Failed to generate preview. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalBtnHtml;
  }
}

document.getElementById('generate-preview-btn').addEventListener('click', generateCakePreview);