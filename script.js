const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx4exu-1dZKlJDOdisBPAMXpk4HxHjTcWXmisBSE9hKCHPFMNXCF5EU864ed5Dn6z_d/exec';

const input = document.getElementById('mediaInput');
const chooseBtn = document.getElementById('chooseBtn');
const progressScreen = document.getElementById('progressScreen');
const progressCount = document.getElementById('progressCount');
const progressBar = document.getElementById('progressBar');
const progressPercent = document.getElementById('progressPercent');
const successScreen = document.getElementById('successScreen');
const uploadAgainBtn = document.getElementById('uploadAgainBtn');
const hero = document.querySelector('.hero');

chooseBtn.addEventListener('click', () => input.click());

input.addEventListener('change', async () => {
  const files = Array.from(input.files);
  input.value = '';
  if (!files.length) return;
  await uploadBatch(files);
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadOne(file) {
  const base64 = await fileToBase64(file);
  const response = await fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      file: base64,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream'
    })
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('სერვერის პასუხი ვერ დამუშავდა.');
  }
  if (!data.success) throw new Error(data.error || 'ატვირთვა ვერ მოხერხდა.');
}

function setProgress(done, total) {
  const percent = total ? Math.round((done / total) * 100) : 0;
  progressCount.textContent = `${done} / ${total} ატვირთულია`;
  progressPercent.textContent = `${percent}%`;
  progressBar.style.width = `${percent}%`;
}

async function uploadBatch(files) {
  hero.hidden = true;
  successScreen.hidden = true;
  progressScreen.hidden = false;

  const total = files.length;
  let completed = 0;
  let nextIndex = 0;
  let failed = false;

  setProgress(0, total);

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= total || failed) return;

      try {
        await uploadOne(files[index]);
        completed++;
        setProgress(completed, total);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  // 3 simultaneous uploads gives a large speed-up without overloading
  // mobile connections or Apps Script with too many requests.
  const concurrency = Math.min(3, total);

  try {
    await Promise.all(
      Array.from({ length: concurrency }, () => worker())
    );

    if (failed) return;

    progressScreen.hidden = true;
    successScreen.hidden = false;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch (error) {
    alert(
      `ატვირთვა შეწყდა. ${completed} / ${total} ფაილი უკვე შენახულია Drive-ში. სცადე დარჩენილი ფაილების თავიდან არჩევა.`
    );
    progressScreen.hidden = true;
    hero.hidden = false;
  }
}

uploadAgainBtn.addEventListener('click', () => {
  successScreen.hidden = true;
  hero.hidden = false;
  setProgress(0, 0);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  setTimeout(() => input.click(), 120);
});
