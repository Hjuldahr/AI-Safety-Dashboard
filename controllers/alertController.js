const getPage = async (req, res) => {
    try{
        res.render("alerts", {
            user: req.user,
        }); 
    }catch (error){
        console.error("Error fetching alert page:", error);
    }
};

export default { getPage };