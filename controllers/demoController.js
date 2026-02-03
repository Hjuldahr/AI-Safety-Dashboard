import { LOADED_MODELS, getModelConfig, setOverride, clearOverride } from '../data_analysis_pipeline/modelRegistry.js';
import fs from 'fs';
import path from 'path';
import { PROJECT_ROOT } from '../app.js';

export const renderDemoPage = (req, res) => {
    res.render('demo', { models: LOADED_MODELS, user: req.user });
};

export const goRogue = (req, res) => {
    const { modelName } = req.body;
    
    if (!modelName) {
        return res.status(400).json({ error: 'Model name is required' });
    }

    try {
        // Get original config
        // clear override first to ensure we get the original
        clearOverride(modelName); 
        const originalConfig = getModelConfig(modelName);

        // Load Rogue Config from file
        const rogueConfigPath = path.join(PROJECT_ROOT, 'data_analysis_pipeline', 'model_configs', 'rogue_model_config.json');
        
        let rogueConfig;
        if (fs.existsSync(rogueConfigPath)) {
             rogueConfig = JSON.parse(fs.readFileSync(rogueConfigPath, 'utf-8'));
        } else {
            throw new Error('Rogue config file not found.');
        }

        // Adapt rogue config to the target model
        // We want the system to think it's the original model, but using rogue stats.
        // Keep the original ModelName, but append (ROGUE) for visibility.
        rogueConfig.META.ModelName = `${modelName} (ROGUE)`;

        // Set override
        setOverride(modelName, rogueConfig);

        console.log(`[Demo] Model ${modelName} has gone ROGUE using rogue_model_config.json.`);
        res.json({ success: true, message: `${modelName} is now ROGUE.` });

    } catch (error) {
        console.error('Error going rogue:', error);
        res.status(500).json({ error: error.message });
    }
};

export const resetModel = (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
         return res.status(400).json({ error: 'Model name is required' });
    }

    if (modelName === 'ALL') {
        LOADED_MODELS.forEach(name => clearOverride(name));
        return res.json({ success: true, message: 'All models reset to normal.' });
    }

    try {
        clearOverride(modelName);
        console.log(`[Demo] Model ${modelName} reset to normal.`);
        res.json({ success: true, message: `${modelName} is back to normal.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
