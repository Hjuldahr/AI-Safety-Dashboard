const getPage = async (req, res) => {
    try{
        res.render("reports", {
            user: req.user,
        });
    }catch (error){
        console.error("Error fetching reports page:", error);
    }
};

export default { getPage };