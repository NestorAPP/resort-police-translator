import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Отключаем локальные модели — грузим с Hugging Face CDN
env.allowLocalModels = false;

const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const inputEl = document.getElementById('input');
const targetSelect = document.getElementById('target-lang');
const btn = document.getElementById('translate-btn');

// Кэш пайплайнов: ru→en, en→tr, en→zh, en→ar, en→de
const pipes = {};

async function getPipe(modelId) {
    if (pipes[modelId]) return pipes[modelId];
    statusEl.textContent = `Загрузка модели ${modelId}... (первый раз может занять время)`;
    pipes[modelId] = await pipeline('translation', modelId);
    statusEl.textContent = 'Модель загружена';
    return pipes[modelId];
}

async function translate(text, targetLang) {
    // Шаг 1: RU → EN (всегда)
    const ruEn = await getPipe('Xenova/opus-mt-ru-en');
    const enResult = await ruEn(text, { max_length: 512 });
    const englishText = enResult[0].translation_text;

    // Если целевой язык английский — возвращаем
    if (targetLang === 'en') return englishText;

    // Шаг 2: EN → target
    const modelMap = {
        tr: 'Xenova/opus-mt-en-tr', // примечание: проверьте наличие на HF
        zh: 'Xenova/opus-mt-en-zh',
        ar: 'Xenova/opus-mt-en-ar',
        de: 'Xenova/opus-mt-en-de'
    };
    const targetModel = modelMap[targetLang];
    if (!targetModel) throw new Error(`Нет модели для ${targetLang}`);

    const enTarget = await getPipe(targetModel);
    const targetResult = await enTarget(englishText, { max_length: 512 });
    return targetResult[0].translation_text;
}

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
