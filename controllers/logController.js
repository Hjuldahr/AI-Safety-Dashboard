const getPage = async (req, res) => {
    try{
        res.render("logs", {
            user: req.user,
        });
    }catch (error){
        console.error("Error fetching logs:", error);
    }
};

const getUserLogs = async (req, res) => {

}

const getAILogs = async (req, res) => {

}

export default { getPage };