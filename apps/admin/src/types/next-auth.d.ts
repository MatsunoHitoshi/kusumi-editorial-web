import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      role: "admin" | "editor";
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: "admin" | "editor";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "editor";
  }
}
