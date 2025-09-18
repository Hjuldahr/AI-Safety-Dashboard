

const getPage = async (req, res) => {
    try{
        res.render("index", {
            user: req.user,
        }); //renders the index.ejs 
    }catch (error){
        console.error("Error fetching homepage content:", error);
    }
};

export default { getPage };