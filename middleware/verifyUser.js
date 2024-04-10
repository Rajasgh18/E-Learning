const jwt = require('jsonwebtoken');
const { SECRET_KEY } = process.env

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization || req.query.token;

    if (!token) return res.status(403).send("A token is required for authentication");

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).send('Invalid token');
    }
}

module.exports = verifyToken;