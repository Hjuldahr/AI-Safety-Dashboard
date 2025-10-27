import scheduler from '../server_side_events/scheduler.js';

const updateParams = (req, res) => {
    scheduler.updateSchedulerSettings(req.body);
    res.json({ success: true, state: req.body });
};

export default {
    updateParams
}