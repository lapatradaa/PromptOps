import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                try {
                    const client = await clientPromise;
                    const user = await client
                        .db("promptops")
                        .collection("users")
                        .findOne({ email: credentials?.email });

                    if (!user) {
                        console.error("User not found");
                        return null;
                    }

                    const isValidPassword = await bcrypt.compare(
                        credentials?.password || "",
                        user.password
                    );

                    if (!isValidPassword) {
                        console.error("Invalid password");
                        return null;
                    }

                    // console.log("User successfully authorized:", {
                    //     id: user._id.toString(),
                    //     username: user.username,
                    //     email: user.email,
                    // });

                    return { id: user._id.toString(), username: user.username };
                } catch (error) {
                    console.error("Error in authorize:", error);
                    return null;
                }
            },
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 2 * 60 * 60, // 2 hours
    },
    jwt: {
        secret: process.env.NEXTAUTH_SECRET,
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.email = user.email; // Include email for consistency
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.username = token.username;
                session.user.email = token.email; // Include email in the session
            }
            return session;
        },
    },

    debug: process.env.NODE_ENV === "development", // Enable debug in development
};