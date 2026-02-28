// demoController.js

import { schedulerState } from '../server_side_events/schedulerState.js';
import { LOADED_MODELS, setScenario, clearScenario, getScenarios, getCurrentScenario } from '../data_analysis_pipeline/utilities/modelRegistry.js';
import { sendNotification } from './notificationController.js';
import { TRIM_COLOURS, BACKGROUND_COLOURS } from "../constants/notification.js";

const viewDefaultDemoPage = (req, res) => {
    const { activeModel } = schedulerState;
    const scenarioNames = Object.keys(getScenarios(activeModel));
    const currentScenario = getCurrentScenario(activeModel);

    res.render('demo', { 
        models: LOADED_MODELS, 
        scenarios: scenarioNames, 
        currentScenario: currentScenario,
        activeModel,
        user: req.user 
    });
};

const viewDemoPage = (req, res) => {
    const { model } = req.params;
    const scenarioNames = Object.keys(getScenarios(model));
    const currentScenario = getCurrentScenario(model);
    res.render('demo', { 
        models: LOADED_MODELS, 
        scenarios: scenarioNames, 
        currentScenario: currentScenario,
        activeModel: model,
        user: req.user 
    });
};

const listScenarios = (req, res) => {
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

const applyScenario = (req, res) => {
    const { modelName, scenarioName } = req.body;
    
    if (!modelName) {
        return res.status(400).json({ error: 'Model name is required' });
    }

    try {
        setScenario(modelName, scenarioName);
        console.log(`[Demo] Model ${modelName} set to ${scenarioName}.`);
        res.json({ success: true, message: `${modelName} is now ${scenarioName}.` });

        sendNotification({
            message: `${modelName} is now ${scenarioName}.`,
            category: "Demo",
            dismissible: true,
            redirectUrl: `/demo/view/${modelName}`,
            autoCalculateTimeout: true,
            trim: TRIM_COLOURS.Info,
            background: BACKGROUND_COLOURS.Info
        });
        
    } catch (error) {
        console.error(`[Demo] Error setting to ${scenarioName}:`, error);
        res.status(500).json({ error: error.message });
    }
};

const resetScenario = (req, res) => {
    const { modelName } = req.body;

    try {
        clearScenario(modelName);
        console.log(`[Demo] Model ${modelName} reset to normal.`);
        res.json({ success: true, message: `${modelName} is back to normal.` });

        sendNotification({
            message: `${modelName} is back to normal.`,
            category: "Demo",
            redirectUrl: `/demo/view/${modelName}`,
            autoCalculateTimeout: true,
            trim: TRIM_COLOURS.Info,
            background: BACKGROUND_COLOURS.Info
        });

    } catch (error) {
        console.error('[Demo] Error going back to normal:', error);
        res.status(500).json({ error: error.message });
    }
};

export default {
    resetScenario,
    viewDemoPage,
    viewDefaultDemoPage,
    applyScenario,
    listScenarios
};