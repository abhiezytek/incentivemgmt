/**
 * User authentication middleware placeholder.
 *
 * Currently passes all requests through. When a user login/session
 * system is implemented (e.g. session cookies, user JWT), this
 * middleware should verify the user's identity and attach user info
 * to req.user before calling next().
 */
export default function userAuth(req, res, next) {
  // TODO: implement user authentication when login system is added
  next();
}
