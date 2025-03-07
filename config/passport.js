
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { Strategy as TwitterStrategy } from "passport-twitter";
import User from "../models/auth/authSchema.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("Google OAuth Callback - Access Token:", accessToken);
      console.log("Google OAuth Callback - Refresh Token:", refreshToken);
      console.log("Google OAuth Callback - Profile:", profile);
      console.log("Google OAuth Callback - Authorization Code:",);
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = new User({
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            email: profile.emails[0].value,
            password: "social-" + Math.random().toString(36).slice(-8),
            googleId: profile.id,
            googleProfile: { 
              emails: profile.emails,
              photos: profile.photos,
              displayName: profile.displayName,
            },
          });
          await user.save();
        } else {
         
          user.googleProfile = user.googleProfile || {};
          user.googleProfile.emails = profile.emails;
          user.googleProfile.photos = profile.photos;
          await user.save();
        }
        done(null, { ...user.toJSON(), googleProfile: profile });
      } catch (err) {
        console.error("Error in Google OAuth callback:", err);
        done(err, null);
      }
    }
  )
);
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL:`${process.env.BACKEND_URL}/api/auth/facebook/callback`,
      profileFields: ["id", "email", "name"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = new User({
            firstName: profile.name.givenName || profile.name.familyName,
            lastName: profile.name.familyName || profile.name.givenName,
            email: profile.emails[0].value,
            password: "social-" + Math.random().toString(36).slice(-8),
          });
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/twitter/callback`,
      includeEmail: true,
    },
    async (token, tokenSecret, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });
        if (!user) {
          user = new User({
            firstName: profile.displayName.split(" ")[0] || "Twitter",
            lastName: profile.displayName.split(" ")[1] || "User",
            email: profile.emails[0].value,
            password: "social-" + Math.random().toString(36).slice(-8),
          });
          await user.save();
        }
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

export default passport;