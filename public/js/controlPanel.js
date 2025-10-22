let interval = 5 * 1000;
let activeModel = "GoodModel";
let isPaused = false;

const pauseText = "⏸ Pause Graphs";
const pauseColour = "#f45b69ff";
const playText = "▶ Resume Graphs";
const playColour = "#2ca58dff"

document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.querySelector("#toggle-button"); //<button>
    const clearButton = document.querySelector("#clear-button"); //<button>
    const modelSelect = document.querySelector("#model-select"); //<select>
    const intervalSelect = document.querySelector("#interval-select"); //<select>

    toggleButton.innerHTML = pauseText;
    toggleButton.style.backgroundColor = pauseColour;

    async function updateServerSettings() {
        try {
            const res = await fetch('/api/updateParams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPaused, interval, activeModel })
            });

            const data = await res.json();
            if (data.success) {
                console.log('Server scheduler state updated:', data.state);
            } else {
                console.error('Failed to update scheduler state');
            }
        } catch (err) {
            console.error('Error updating scheduler state:', err);
        }
    }

    toggleButton.addEventListener('click', () => {
        isPaused = !isPaused;
        toggleButton.innerHTML = isPaused ? playText : pauseText;
        toggleButton.style.backgroundColor = isPaused ? playColour: pauseColour;

        updateServerSettings();
    })

    clearButton.addEventListener('click', () => {
        window.myChartUtils.resetCharts();
    })

    modelSelect.addEventListener('change', (event) => {
        activeModel = event.target.value;

        updateServerSettings();
    })

    intervalSelect.addEventListener('change', (event) => {
        interval = event.target.value * 1000; //s -> ms

        updateServerSettings();
    })
});