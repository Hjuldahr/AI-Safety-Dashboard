import { LOADED_MODELS, setScenario, clearScenario } from '../data_analysis_pipeline/utilities/modelRegistry.js';

export const renderDemoPage = (req, res) => {
    res.render('demo', { models: LOADED_MODELS, user: req.user });
};

export const goRogue = (req, res) => {
    const { modelName } = req.body;
    
    if (!modelName) {
        return res.status(400).json({ error: 'Model name is required' });
    }

    try {
        // OLD PoC Code prior to modelRegistry refactor
        /*
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
        */

        setScenario(modelName, 'Rogue');
        console.log(`[Demo] Model ${modelName} set to Rogue.`);
        res.json({ success: true, message: `${modelName} is now ROGUE.` });
       
    } catch (error) {
        console.error('[Demo] Error going rogue:', error);
        res.status(500).json({ error: error.message });
    }
};

export const resetModel = (req, res) => {
    
    const { modelName } = req.body;
    // OLD PoC Code prior to modelRegistry refactor
    /*
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
    */
   try {
        clearScenario(modelName);
        console.log(`[Demo] Model ${modelName} reset to normal.`);
        res.json({ success: true, message: `${modelName} is back to normal.` });
    } catch (error) {
        console.error('[Demo] Error going back to normal:', error);
        res.status(500).json({ error: error.message });
    }
};