const express = require("express");
const registerUser = require("../controller/registerUser");
const checkEmail = require("../controller/checkEmail");
const checkPassword = require("../controller/checkPassword");
const userDetails = require("../controller/userDetails");
const logout = require("../controller/logout");
const updateUserDetails = require("../controller/updateUserDetails");
const searchUser = require("../controller/searchUser");

const router = express.Router();

//create user api
router.post("/register", registerUser);
//check user email
router.post("/email", checkEmail);
//check user password
router.post("/password", checkPassword);
//login user details
router.get("/user-details", userDetails);
//logout user
router.get("/logout", logout);
//update user details
router.post("/update-user", updateUserDetails);
//search user
router.post("/search-user", searchUser);

router.post("/translate", async (req, res) => {
  try {
    console.log(req.body);
    // const response = await fetch("https://translate.opentran.net/translate", {
    //   body: req.body,
    //   headers: { "Content-Type": "application/json" },
    //   method: "POST",
    // });
    // const data = await response.json();
    // console.log({ data });
    // res.json(data); // Send translated response back to frontend
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

module.exports = router;
