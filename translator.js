import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
// env.useBrowserCache по умолчанию true — не трогаем

const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const inputEl = document.getElementById('input');
const targetSelect = document.getElementById('target-lang');
const btn = document.getElementById('translate-btn');
const preloadBtn = document.getElementById('preload-btn');
const preloadStatusEl = document.getElementById('preload-status');

const pipes = {};

// Список моделей для предзагрузки (турецкий пока отсутствует — нет ONNX en-tr)
const MODELS = [
    'Xenova/opus-mt-ru-en',
    'Xenova/opus-mt-en-zh',
    'Xenova/opus-mt-en-ar',
    'Xenova/opus-mt-en-de'
];

// Проверка свободного места (важно для iOS)
async function checkStorage() {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const availableMB = ((estimate.quota - estimate.usage) / 1024 / 1024).toFixed(0);
        console.log(`Доступно места: ${availableMB} MB`);
        if (availableMB < 500) {
            statusEl.textContent = `Мало места: ${availableMB} MB. Освободите память.`;
            statusEl.style.color = 'red';
            return false;
        }
    }
    return true;
}

// Загрузка одной модели с прогрессом
async function loadModel(modelId, progressEl) {
    if (pipes[modelId]) return pipes[modelId];
    progressEl.textContent = `Загрузка ${modelId}...`;
    progressEl.style.color = 'orange';
    pipes[modelId] = await pipeline('translation', modelId, {
        progress_callback: (data) => {
            if (data.status === 'progress') {
                progressEl.textContent = `Загрузка ${modelId}: ${Math.round(data.progress)}%`;
            }
        }
    });
    progressEl.textContent = `Модель ${modelId} готова`;
    progressEl.style.color = 'green';
    return pipes[modelId];
}

// Предзагрузка всех моделей
async function preloadModels(progressEl) {
    const ok = await checkStorage();
    if (!ok) return;

    for (const modelId of MODELS) {
        try {
            await loadModel(modelId, progressEl);
        } catch (e) {
            console.error(`Ошибка загрузки ${modelId}:`, e);
            progressEl.textContent = `Ошибка загрузки ${modelId}. Проверьте интернет.`;
            progressEl.style.color = 'red';
            return;
        }
    }
    progressEl.textContent = 'Все модели готовы к работе (офлайн)';
    progressEl.style.color = 'green';
}

// Перевод: RU → EN, затем EN → target (пивот)
async function translate(text, targetLang) {
    const ruEn = await loadModel('Xenova/opus-mt-ru-en', statusEl);
    const enResult = await ruEn(text, { max_length: 512 });
    const englishText = enResult[0].translation_text;

    if (targetLang === 'en') return englishText;

    const modelMap = {
        zh: 'Xenova/opus-mt-en-zh',
        ar: 'Xenova/opus-mt-en-ar',
        de: 'Xenova/opus-mt-en-de'
        // tr: пока нет подтверждённой ONNX-модели en-tr
    };
    const targetModel = modelMap[targetLang];
    if (!targetModel) throw new Error(`Нет модели для ${targetLang}`);

    const enTarget = await loadModel(targetModel, statusEl);
    const targetResult = await enTarget(englishText, { max_length: 512 });
    return targetResult[0].translation_text;
}

// Автозапуск предзагрузки при открытии страницы
preloadModels(statusEl);

// Кнопка «Скачать все модели»
if (preloadBtn) {
    preloadBtn.addEventListener('click', async () => {
        preloadBtn.disabled = true;
        await preloadModels(preloadStatusEl);
        preloadBtn.disabled = false;
    });
}

// Кнопка «Перевести»
btn.addEventListener('click', async () => {
    const text = inputEl.value.trim();
    if (!text) return;
    const target = targetSelect.value;
    try {
        outputEl.textContent = '...';
        const result = await translate(text, target);
        outputEl.textContent = result;
    } catch (e) {
        outputEl.textContent = 'Ошибка: ' + e.message;
    }
});
