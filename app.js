const port = process.env.PORT || 3000;
const appPromise = require('./server')


appPromise.then(app => {
    app.listen(port, () => {
    console.log(`Server is running on port ` + port)
    });
});