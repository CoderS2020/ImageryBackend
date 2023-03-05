const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  firstname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  age: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  fullName: {
    type: String,
  },
  about: {
    type: String,
  },
  location: {
    type: String,
  },
  gender: {
    type: String,
  },
  profilepic: {
    type: String,
  },
  ImageryId: {
    type: String,
  },
  followers: [{}],
  following: [{}],
  resetLink: {
    data: String,
    default: '',
  },
  contact_messages: [
    {
      name: {
        type: String,
      },
      email: {
        type: String,
      },
      country: {
        type: String,
      },
      message: {
        type: String,
      },
      rating: {
        type: String,
      },
    },
  ],
  addedImages: [{}],
  tokens: [
    {
      token: {
        type: String,
        required: true,
      },
    },
  ],
});

//Hashing password
userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

//Generating token
userSchema.methods.generateAuthToken = async function () {
  try {
    let token = jwt.sign({ _id: this._id }, process.env.SECRET_KEY);
    this.tokens = this.tokens.concat({ token: token });
    await this.save();
    return token;
  } catch (error) {
    console.log(error);
  }
};

//Stored contact_messages
userSchema.methods.addMessage = async function (
  name,
  email,
  country,
  message,
  rating
) {
  try {
    this.contact_messages = this.contact_messages.concat({
      name,
      email,
      country,
      message,
      rating,
    });
    await this.save();
    return this.contact_messages;
  } catch (error) {
    console.log(error);
  }
};

const User = mongoose.model('USER', userSchema);

module.exports = User;
