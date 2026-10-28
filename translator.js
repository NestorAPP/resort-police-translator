import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

env.allowLocalModels = false;
// env.useBrowserCache = true; // это значение по умолчанию, можно не писать

const statusEl = document.getElementById('status');
const outputEl = document.getElementById('output');
const inputEl = document.getElementById('input');
const targetSelect = document.getElementById('target-lang');
const btn = document.getElementById('translate-btn');

const pipes = {};

// Функция предзагрузки — вызывается сразу при старте
async function preloadModels() {
    const modelsToPreload = [
        'Xenova/opus-mt-ru-en',
        'Xenova/opus-mt-en-zh',
        'Xenova/opus-mt-en-ar',
        'Xenova/opus-mt-en-de'
        // турецкий пока пропускаем, если нет модели
    ];

    for (const modelId of modelsToPreload) {
        if (pipes[modelId]) continue;
        
        statusEl.textContent = `Подготовка модели: ${modelId}...`;
        statusEl.style.color = 'orange';
        
        try {
            pipes[modelId] = await pipeline('translation', modelId, {
                progress_callback: (data) => {
                    if (data.status === 'progress') {
                        statusEl.textContent = `Загрузка ${modelId}: ${Math.round(data.progress)}%`;
                    }
                }
            });
            statusEl.textContent = `Модель ${modelId} готова`;
            statusEl.style.color = 'green';
        } catch (e) {
            console.error(`Ошибка загрузки ${modelId}:`, e);
            statusEl.textContent = `Ошибка загрузки ${modelId}. Проверьте интернет.`;
            statusEl.style.color = 'red';
            // Не прерываем загрузку остальных моделей
        }
    }
    statusEl.textContent = 'Все модели готовы к работе (офлайн)';
    statusEl.style.color = 'green';
}

// Запускаем предзагрузку сразу при открытии
preloadModels();

// ... остальной код translate() и обработчик кнопки остаются как были
