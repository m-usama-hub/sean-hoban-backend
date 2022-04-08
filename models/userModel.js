const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
  }
);
const freelancerSchema = new mongoose.Schema(
  {},
  {
    timestamps: true,
  }
);
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    role: {
      type: String,
      enum: ["super-admin", "admin", "customer", "freelancer"],
      default: "customer",
    },
    fcmToken: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    email: {
      type: String,
      unique: true,
      required: [true, "Please provide your email"],
      lowercase: true,
      validate: [validator.isEmail, "Please provide a valid email"],
      index: true,
    },
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
    deactivate: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: Date.now(),
    },
    password: {
      type: String,
      // required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, "Please confirm your password"],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: "Passwords are not the same!",
      },
    },
    isEmailActive: {
      type: Boolean,
      default: true,
    },
    photo: {
      type: String,
      default: undefined,
    },
    contactNo: {
      type: Number,
      unique: true,
      required: true,
    },
    customerDetails: customerSchema,
    freelancerDetails: freelancerSchema,

    deviceId: {
      type: String,
      required: [true, "Please Provide Login Id"],
    },

    violationAttempts: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "blocked"],
    },

    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    socketId: {
      type: String,
      default: null,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    // STRIPE PROPS -------------------------------STARTS
    // premium: {
    //   type: Boolean,
    //   default: false,
    // },
    cus: {
      type: String,
      required: [true, "stripe customer id is required."],
    },
    // plan: {
    //   type: String,
    //   default: null,
    // },
    // subscriptionType: {
    //   type: String,
    //   enum: ['quater', 'half', 'full', 'none'],
    //   default: 'none',
    // },
    // isSubscriptionOn: {
    //   type: Boolean,
    //   default: false,
    // },

    /* 
    _id:619d62731d00009c62905d,
    subscription:"sub_1Jz6xwHOV99999jJdJS7oBP",
    plan:"price_1JkBwHHOVyleiVH6666hk2", 
    */
    // subscriptionAssignedByadmin: { type: Boolean, default: false },
    // subscription: {
    //   type: String,
    //   default: null,
    // },
    // subscriptionStartDate: {
    //   type: Date,
    //   default: null,
    // },
    // subscriptionEndDate: {
    //   type: Date,
    //   default: null,
    // },
    // STRIPE PROPS -------------------------------ENDS
  },
  {
    timestamps: true,
  }
);

// Virtual populate
userSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "User",
  localField: "_id",
});

userSchema.set("toObject", { virtuals: true });
userSchema.set("toJSON", { virtuals: true });
userSchema.index({ location: "2dsphere" });

userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("password")) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// userSchema.pre(/^find/, function (next) {
//   // this points to the current query
//   this.find({ active: { $ne: false } });
//   next();
// });

// userSchema.virtual('displayName').get(function() {
//   return `${this.firstName} ${this.lastName}`;
// });

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
