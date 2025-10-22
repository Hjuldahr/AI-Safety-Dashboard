document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.querySelector("#toggle-button"); //<button>
    const clearButton = document.querySelector("#clear-button"); //<button>
    const modelSelect = document.querySelector("#model-select"); //<select>

    const pauseText = "⏸ Pause Graphs";
    const pauseColour = "#f45b69ff";
    const playText = "▶ Resume Graphs";
    const playColour = "#2ca58dff"

    var isPaused = false;
    toggleButton.innerHTML = pauseText;
    toggleButton.style.backgroundColor = pauseColour;

    var updateRate = 5 * 1000;
    var modelName = "good";

    function sendChartParameters() {
        fetch('api/chartParams', {
            method: "POST",
            body: JSON.stringify({
                userId: 1,
                pauseState: isPaused,
                chartUpdateInterval: updateRate,
                modelLabel: modelName,
            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        });
    };

    toggleButton.addEventListener('click', () => {
        isPaused = !isPaused;
        toggleButton.innerHTML = isPaused ? playText : pauseText;
        toggleButton.style.backgroundColor = isPaused ? playColour: pauseColour;

        sendChartParameters();
    })

    clearButton.addEventListener('click', () => {
        window.myChartUtils.resetCharts();
    })

    modelSelect.addEventListener('change', (event) => {
        modelName = event.target.value;

        sendChartParameters();
    })
});