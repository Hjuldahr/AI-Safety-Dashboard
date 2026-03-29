// demoController.js

import { schedulerState } from '../server_side_events/schedulerState.js';
import { LOADED_MODELS, setScenario, clearScenario, getScenarios, getCurrentScenario } from '../data_analysis_pipeline/utilities/modelRegistry.js';
import { sendNotification } from './notificationController.js';
import { TRIM_COLOURS, BACKGROUND_COLOURS } from "../constants/notification.js";

const viewDemoPage = (req, res) => {
    const requestedModel = req.query.model;
    const currentModel =
        requestedModel && LOADED_MODELS.includes(requestedModel)
            ? requestedModel
            : schedulerState.activeModel;

    const scenarios = getScenarios(currentModel) || {};
    const scenarioNames = Object.keys(scenarios);
    const currentScenario = getCurrentScenario(currentModel);

    res.render('demo', {
        models: LOADED_MODELS,
        scenarios: scenarioNames,
        currentScenario,
        currentModel,
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
        res.json({ success: true, message: `[${modelName}] Was set to ${scenarioName} by ${req.user.username}` });

        sendNotification({
            message: `[${modelName}] Was set to ${scenarioName} by ${req.user.username}.`,
            category: "Demo",
            dismissible: true,
            redirectUrl: `/demo?model=${modelName}`,
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
        res.json({ success: true, message: `[${modelName}] Was reset to Normal by ${req.user.username}` });

        sendNotification({
            message: `[${modelName}] Was reset to Normal by ${req.user.username}`,
            category: "Demo",
            redirectUrl: `/demo?model=${modelName}`,
            autoCalculateTimeout: true,
            trim: TRIM_COLOURS.Info,
            background: BACKGROUND_COLOURS.Info
        });

    } catch (error) {
        console.error('[Demo] Error going back to normal:', error);
        res.status(500).json({ error: error.message });
    }
};

const renderComponentLibrary = (req, res) => {
    res.render('component_demo', {
        user: req.user
    })
};

export default {
    resetScenario,
    viewDemoPage,
    applyScenario,
    listScenarios,
    renderComponentLibrary
};