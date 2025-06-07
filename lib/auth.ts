// lib/auth.ts
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

                    return {
                        id: user._id.toString(),
                        username: user.username,
                        email: user.email
                    };
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
    cookies: {
        sessionToken: {
            name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.username = user.username;
                token.email = user.email;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.username = token.username as string;
                session.user.email = token.email as string;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // For development, don't replace localhost
            if (process.env.NODE_ENV === 'development') {
                return url;
            }

            // For production, handle domain replacement
            if (url.includes('localhost')) {
                return url.replace('localhost:3000', '45.144.167.21.sslip.io');
            }

            // Handle other redirects
            return url.startsWith(baseUrl)
                ? url
                : baseUrl + url.substring(url.indexOf('/', 8));
        }
    },
    debug: process.env.NODE_ENV === "development",
};