const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require('nodemailer');
const _ = require('lodash');
const Authenticate = require('../middleware/Authenticate'); //requiring middleware
const BASE_URL = process.env.BASE_URL;

//Requiring conn.js file
require('../db/conn');

//Requiring userSchema
const User = require('../model/userSchema');

//Requiring imageSchema
const Image = require('../model/imageSchema');

router.get('/', (req, res) => {
  res.send(`Hello from server in auth.js ${process.env.PORT}`);
});

//Sending emails
let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

//Sign up
router.post('/register', async (req, res) => {
  const { firstname, lastname, email, password, age, ImageryId } = req.body;
  const fullName = firstname + ' ' + lastname;

  if (!firstname || !lastname || !email || !password || !age) {
    res.status(422).json({ error: 'Please fill Everything' });
  }

  try {
    const userExist = await User.findOne({ email: email });
    if (userExist) {
      return res.status(422).json({ error: 'Email already taken.' });
    }

    const token1 = jwt.sign(
      { firstname, lastname, email, password, age, fullName, ImageryId },
      process.env.SECRET_KEY,
      { expiresIn: '20m' }
    );

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Imagery Authentication!',
      html: `
            <h2>Please click on the given link to activate your account.</h2>
            <a href='${BASE_URL}/activate/${token1}'>Activate</a>

            `,
    };

    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log('Error sending message: ' + err);
      } else {
        // no errors, it worked
        console.log('Message sent succesfully.');
      }
    });

    // const user = new User({ firstname, lastname, email, password, age, fullName, ImageryId });

    // await user.save();

    res.status(201).json({ message: 'Mail sent successfully!!' });
  } catch (error) {
    console.log(error);
  }
});

//Email Verrification after signup
router.post('/emailVerification', (req, res) => {
  const { token1 } = req.body;

  try {
    if (token1) {
      jwt.verify(token1, process.env.SECRET_KEY, function (err, decodedToken) {
        if (err) {
          return res.status(404).json({ error: 'Incorrect or expired link' });
        }
        const {
          firstname,
          lastname,
          email,
          password,
          age,
          fullName,
          ImageryId,
        } = decodedToken;

        const userExist = User.findOne({ firstname: firstname });
        // console.log(userExist);
        if (userExist) {
          const userExist = User.findOneAndUpdate({
            firstname,
            lastname,
            email,
            password,
            age,
            fullName,
            ImageryId,
          });
          res.status(201).json(true);

          // return res.status(422).json({ error: "Email already verified."});
        }

        const user = new User({
          firstname,
          lastname,
          email,
          password,
          age,
          fullName,
          ImageryId,
        });

        user.save();

        res.status(201).json(true);
      });
    } else {
      return res.json({ error: 'Something went wrong!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Forgot Password
router.put('/forgotPassword', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(404).json({ error: 'Please enter your email.' });
  }

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'No such user exists.' });
    }

    const token2 = jwt.sign({ _id: user._id }, process.env.RESET_KEY, {
      expiresIn: '20m',
    });

    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: 'Imagery Account Password Reset',
      html: `
            <h2>Please click on the given link to reset your password.</h2>
            <a href='${BASE_URL}/resetpassword/${token2}'>Reset Password</a>

            `,
    };

    return user.updateOne({ resetLink: token2 }, function (err, success) {
      if (err) {
        return res.status(400).json({ error: 'reset password link error' });
      }

      transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
          console.log('Error sending message: ' + err);
        } else {
          // no errors, it worked
          console.log('Message sent succesfully.');
        }
      });
      return res
        .status(200)
        .json('Email has been sent, kindly follow the instructions');
    });
  });
});

//Reset Password
router.put('/resetPassword', (req, res) => {
  const { resetLink, newPassword } = req.body;
  if (!newPassword) {
    return res.status(401).json({
      error: 'Please enter new password.',
    });
  }
  if (resetLink) {
    jwt.verify(resetLink, process.env.RESET_KEY, function (err, decodedData) {
      if (err) {
        return res.status(401).json({
          error: 'Incorrect token or expired token',
        });
      }

      User.findOne({ resetLink }, (err, user) => {
        if (err || !user) {
          return res.status(400).json({ error: 'Something went wrong...' });
        }
        const obj = {
          password: newPassword,
          resetLink: '',
        };

        user = _.extend(user, obj); //lodash
        user.save((err, result) => {
          if (err) {
            return res.status(400).json({ error: 'Reset Password Error' });
          } else {
            return res
              .status(200)
              .json({ message: 'Your password has been changed' });
          }
        });
      });
    });
  } else {
    return res.status(401).json({ error: 'Authentication error!!' });
  }
});

//Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'please fill everything' });
  }

  try {
    const userLogin = await User.findOne({ email: email });
    // console.log(userLogin);

    if (userLogin) {
      const isMatch = await bcrypt.compare(password, userLogin.password);

      const token = await userLogin.generateAuthToken();

      res.cookie('jwtoken', token, {
        expires: new Date(Date.now() + 100000000),
        httpOnly: true,
      });

      if (!isMatch) {
        return res.status(400).json({ error: 'Invalid credentials' });
      } else {
        return res.json(userLogin);
      }
    } else {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Google Signup
const client = new OAuth2Client(process.env.OAUTH_CLIENT_ID);
router.post('/googlesignup', async (req, res) => {
  let d = new Date();
  let time = String(
    String(d.getDate()) +
      String(d.getMonth()) +
      String(d.getFullYear()) +
      String(d.getHours()) +
      String(d.getMinutes()) +
      String(d.getSeconds())
  );

  const { tokenId } = req.body;
  try {
    const response = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.OAUTH_CLIENT_ID,
    });

    const { email_verified, name, email, given_name, family_name, picture } =
      response.payload;
    const profilepic = picture;
    const fullName = name;
    let ImageryId = (String(given_name) + time).trim();

    if (email_verified) {
      const userLogin = await User.findOne({ email: email });

      if (userLogin) {
        const isMatch = await bcrypt.compare(
          email + process.env.ANYTHING,
          userLogin.password
        );

        const token = await userLogin.generateAuthToken();

        res.cookie('jwtoken', token, {
          expires: new Date(Date.now() + 100000000),
          httpOnly: true,
        });

        if (!isMatch) {
          return res.status(400).json({ error: 'Invalid credentials' });
        } else {
          return res.json(userLogin);
        }
      } else {
        let password = email + process.env.ANYTHING;
        let firstname = given_name;
        let lastname = family_name;
        let age = 18;

        const user = new User({
          firstname,
          lastname,
          email,
          password,
          age,
          fullName,
          ImageryId,
          profilepic,
        });

        await user.save();

        res.status(201).json({
          messageSuccess:
            'User registered successfully,Please Continue with Google again',
        });
      }
    }
  } catch (error) {
    return res.status(400).json({
      error: 'Something went wrong...',
    });
  }
});

//Google Login
router.post('/googlelogin', async (req, res) => {
  let d = new Date();
  let time = String(
    String(d.getDate()) +
      String(d.getMonth()) +
      String(d.getFullYear()) +
      String(d.getHours()) +
      String(d.getMinutes()) +
      String(d.getSeconds())
  );

  const { tokenId } = req.body;
  try {
    const response = await client.verifyIdToken({
      idToken: tokenId,
      audience: process.env.OAUTH_CLIENT_ID,
    });

    const { email_verified, name, email, given_name, family_name, picture } =
      response.payload;
    const profilepic = picture;
    const fullName = name;
    let ImageryId = (String(given_name) + time).trim();

    if (email_verified) {
      const userLogin = await User.findOne({ email: email });

      if (userLogin) {
        const isMatch = await bcrypt.compare(
          email + process.env.ANYTHING,
          userLogin.password
        );

        const token = await userLogin.generateAuthToken();

        res.cookie('jwtoken', token, {
          expires: new Date(Date.now() + 100000000),
          httpOnly: true,
        });

        if (!isMatch) {
          return res.status(400).json({ error: 'Invalid credentials' });
        } else {
          return res.json(userLogin);
        }
      } else {
        let password = email + process.env.ANYTHING;
        let firstname = given_name;
        let lastname = family_name;
        let age = 18;

        const user = new User({
          firstname,
          lastname,
          email,
          password,
          age,
          fullName,
          ImageryId,
          profilepic,
        });

        await user.save();

        res.status(201).json({
          messageSuccess:
            'User registered successfully,Please Continue with Google again',
        });
      }
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      error: 'Something went wrong...',
    });
  }
});

//get user data for contact us page

router.get('/getdata', Authenticate, (req, res) => {
  res.status(200).send(req.rootUser);
  // console.log(req.cookies.jwtoken);
});

//Contact Us form info posted here
router.post('/contact', Authenticate, async (req, res) => {
  try {
    const { name, email, country, message, rating } = req.body;
    if (!name || !email || !country) {
      return res.status(400).json({ error: 'Please fill the required inputs' });
    }

    const userContact = await User.findOne({ _id: req.userId });
    if (userContact) {
      const userMessage = await userContact.addMessage(
        name,
        email,
        country,
        message,
        rating
      );
      await userContact.save();
      res.status(201).json({ message: 'Contact form details saved.' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Update info posted here (Edit profile page)

router.post('/updateprofile', async (req, res) => {
  try {
    const { firstname, lastname, email, about, location, gender, profilepic } =
      req.body;
    const fullName = firstname + ' ' + lastname;
    const editDetails = await User.findOneAndUpdate(
      { email: email },
      { firstname, lastname, about, location, gender, profilepic, fullName },
      { new: true }
    );
    // const userContact=await User.findOne({_id:req.userId});
    if (editDetails) {
      res.status(201).json(editDetails);
    }
  } catch (error) {
    console.log(error);
  }
});

//Logout page
router.get('/logout', (req, res) => {
  res.clearCookie('jwtoken', { path: '/' });
  res.status(200).send('User is logged out!!');
});

//Saving image
router.post('/saveimage', async (req, res) => {
  const {
    author,
    title,
    description,
    destination,
    tags,
    pin_sizes,
    url,
    email,
    timeofUpload,
    idUploader,
  } = req.body;

  if (!url) {
    res.status(422).json({ error: 'Something went wrong!!' });
  }

  try {
    const imageInfo = new Image({
      author,
      title,
      description,
      destination,
      tags,
      pin_sizes,
      url,
      email,
      timeofUpload,
      idUploader,
    });

    await imageInfo.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.log(error);
  }
});

const UserImageRendering = require('../middleware/UserImageRendering'); //requiring middleware

router.post('/getuserimages', UserImageRendering, (req, res) => {
  res.send(req.rootImage);
});

//Get all images
router.post('/getallimages', async (req, res) => {
  try {
    const allImages = await Image.find();

    if (allImages) {
      res.send(allImages);
    } else {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Getting image data
router.post('/getimagedata', async (req, res) => {
  const { _id } = req.body;
  try {
    const imageData = await Image.find({ _id });

    if (imageData) {
      res.send(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Like functionality
router.post('/Like', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const imageData = await Image.findByIdAndUpdate(
      imageid,
      { $push: { likes: userId } },
      { new: true }
    );

    if (imageData) {
      // console.log("Liked successfully");
      res.status(201).json(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Unlike image
router.post('/unLike', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const imageData = await Image.findByIdAndUpdate(
      imageid,
      { $pull: { likes: userId } },
      { new: true }
    );

    if (imageData) {
      // console.log("Unliked successfully");
      res.status(201).json(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Add to Collection
router.post('/addImageCollection', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const userData = await User.findByIdAndUpdate(
      userId,
      { $push: { addedImages: imageid } },
      { new: true }
    );

    if (userData) {
      console.log('Image added to collection successfully');
      res.status(201).json(userData);
    } else {
      return res.status(400).json({ error: 'Image not added to collection!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Remove from Collection
router.post('/removeImageCollection', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const userData = await User.findByIdAndUpdate(
      userId,
      { $pull: { addedImages: imageid } },
      { new: true }
    );

    if (userData) {
      // console.log("Image added to collection successfully");
      res.status(201).json(userData);
    } else {
      return res.status(400).json({ error: 'Image not added to collection!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Download Count
router.post('/downloadCount', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const imageData = await Image.findByIdAndUpdate(
      imageid,
      { $push: { download: userId } },
      { new: true }
    );

    if (imageData) {
      // console.log("Download increased successfully");
      res.status(201).json(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Share count
router.post('/shareCount', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const imageData = await Image.findByIdAndUpdate(
      imageid,
      { $push: { share: userId } },
      { new: true }
    );

    if (imageData) {
      // console.log("Share increased successfully");
      res.status(201).json(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//View Count
router.post('/viewCount', async (req, res) => {
  const { imageid, userId } = req.body;
  try {
    const imageData = await Image.findByIdAndUpdate(
      imageid,
      { $push: { view: userId } },
      { new: true }
    );

    if (imageData) {
      // console.log("View increased successfully");
      res.status(201).json(imageData);
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//User Profile
router.post('/userprofile', async (req, res) => {
  const { userId } = req.body;

  try {
    const userData = await User.findById(userId);

    if (userData) {
      res.status(201).json(userData);
    } else {
      return res.status(400).json({ error: 'User not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

//Follow Functionality
router.post('/follow', (req, res) => {
  const { authorId, selfId } = req.body;

  try {
    var Sname, Spic, Sid;
    var Aname, Apic, Aid;

    User.findById(selfId, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        Sname = docs.fullName;
        Spic = docs.profilepic;
        Sid = docs._id;

        User.findById(authorId, function (err, docs1) {
          if (err) {
            console.log(err);
          } else {
            Aname = docs1.fullName;
            Apic = docs1.profilepic;
            Aid = docs1._id;
            // console.log(Sname, Spic, Sid, Aname, Apic, Aid)

            User.findByIdAndUpdate(
              authorId,
              { $push: { followers: { Sname, Spic, Sid } } },
              { new: true },
              (err, result) => {
                if (err) {
                  return res.status(422).json({ error: err });
                }

                User.findByIdAndUpdate(
                  selfId,
                  { $push: { following: { Aname, Apic, Aid } } },
                  { new: true }
                )
                  .then((result) => {
                    res.json(result);
                  })
                  .catch((err) => {
                    return res.status(422).json({ error: err });
                  });
              }
            );
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

//UnFollow Functionality
router.post('/unfollow', (req, res) => {
  const { authorId, selfId } = req.body;

  try {
    var Sname, Spic, Sid;
    var Aname, Apic, Aid;

    User.findById(selfId, function (err, docs) {
      if (err) {
        console.log(err);
      } else {
        Sname = docs.fullName;
        Spic = docs.profilepic;
        Sid = docs._id;

        User.findById(authorId, function (err, docs1) {
          if (err) {
            console.log(err);
          } else {
            Aname = docs1.fullName;
            Apic = docs1.profilepic;
            Aid = docs1._id;
            // console.log(Sname, Spic, Sid, Aname, Apic, Aid)

            User.findByIdAndUpdate(
              authorId,
              { $pull: { followers: { Sname, Spic, Sid } } },
              { new: true },
              (err, result) => {
                if (err) {
                  return res.status(422).json({ error: err });
                }

                User.findByIdAndUpdate(
                  selfId,
                  { $pull: { following: { Aname, Apic, Aid } } },
                  { new: true }
                )
                  .then((result) => {
                    res.json(result);
                  })
                  .catch((err) => {
                    return res.status(422).json({ error: err });
                  });
              }
            );
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

//delete post
router.post('/deletepost', async (req, res) => {
  const { imageid } = req.body;

  try {
    const imageData = await Image.findByIdAndDelete({ _id: imageid });

    if (imageData) {
      res.status(201).json('Deleted successfully!');
    } else {
      return res.status(400).json({ error: 'Image not found!!' });
    }
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
