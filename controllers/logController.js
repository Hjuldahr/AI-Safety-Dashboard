const getPage = async (req, res) => {
    try{
        res.render("logs", {
            user: req.user,
        });
    }catch (error){
        console.error("Error fetching logs:", error);
    }
};

export default { getPage };