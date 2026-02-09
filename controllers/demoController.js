import { LOADED_MODELS, setScenario, clearScenario, getScenarios, getCurrentScenario } from '../data_analysis_pipeline/utilities/modelRegistry.js';

export const renderDemoPage = (req, res) => {
    // TODO set curret scenario as default
    const firstModel = LOADED_MODELS[0];
    const scenarioNames = Object.keys(getScenarios(firstModel));
    const currentScenario = getCurrentScenario(firstModel);
    res.render('demo', { 
        models: LOADED_MODELS, 
        scenarios: scenarioNames, 
        currentScenario,
        user: req.user 
    });
};

export const listScenarios = (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ error: 'Model name is required' });
    }

    const scenarios = getScenarios(modelName);
    if (!scenarios || scenarios.length === 0) {
        return res.status(400).json({ error: 'No scenarios found' });
    }
    const currentScenario = getCurrentScenario(modelName);

    res.json({
        scenarios: Object.keys(scenarios),
        currentScenario
    });
};

export const applyScenario = (req, res) => {
    const { modelName, scenarioName } = req.body;
    
    if (!modelName) {
        return res.status(400).json({ error: 'Model name is required' });
    }

    try {
        setScenario(modelName, scenarioName);
        console.log(`[Demo] Model ${modelName} set to ${scenarioName}.`);
        res.json({ success: true, message: `${modelName} is now ${scenarioName}.` });
        
    } catch (error) {
        console.error(`[Demo] Error setting to ${scenarioName}:`, error);
        res.status(500).json({ error: error.message });
    }
};

export const resetScenario = (req, res) => {
    const { modelName } = req.body;

    try {
        clearScenario(modelName);
        console.log(`[Demo] Model ${modelName} reset to normal.`);
        res.json({ success: true, message: `${modelName} is back to normal.` });
    } catch (error) {
        console.error('[Demo] Error going back to normal:', error);
        res.status(500).json({ error: error.message });
    }
};