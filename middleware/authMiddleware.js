export const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }

    // If they are NOT authenticated, we redirect them to the login page.
    res.redirect('/login');
};