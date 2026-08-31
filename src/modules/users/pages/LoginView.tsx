import React, { useState } from "react";
import {
  User as UserIcon,
  Lock,
  BookOpen,
  Feather,
  Atom,
  Settings,
  GraduationCap,
  CheckCircle2,
} from "lucide-react";
import { storage } from "../../../services/storage";
import { User } from "../../../types/index";
import { verifyPassword } from "../../../utils/crypto";

interface LoginViewProps {
  onLogin: (rememberMe: boolean, loggedInUser?: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const users = storage.getUsers();
  const defaultUser = storage.getCurrentUser() || users[0];

  const isRemembered = localStorage.getItem("rememberMe") === "true";
  let rememberedUsername = localStorage.getItem("rememberedUsername");
  if (rememberedUsername) {
    const exists = users.find(
      (u) =>
        u.username === rememberedUsername || u.email === rememberedUsername,
    );
    if (!exists) rememberedUsername = null;
  }
  const savedUsername =
    rememberedUsername ||
    defaultUser?.username ||
    users[0]?.username ||
    "ahmed_admin";

  const [username, setUsername] = useState(savedUsername);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(isRemembered);
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    const matched = users.find(
      (u) => u.username === savedUsername || u.email === savedUsername,
    );
    return matched?.id || defaultUser?.id || users[0]?.id || "";
  });
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleSelectUser = (uId: string) => {
    setSelectedUserId(uId);
    const freshUsers = storage.getUsers();
    const u = freshUsers.find((item) => item.id === uId);
    if (u) {
      setUsername(u.username || u.email.split("@")[0]);
      setPassword(""); // Password must NOT be auto-filled
      setLoginError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const allUsers = storage.getUsers();
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // 1. Strictly find user in storage by username, email, or full name
    const matchedUser = allUsers.find((u) => {
      const uName = (u.username || "").trim().toLowerCase();
      const uEmail = (u.email || "").trim().toLowerCase();
      const uFullName = (u.name || "").trim().toLowerCase();
      return (
        uName === cleanUsername ||
        uEmail === cleanUsername ||
        uFullName === cleanUsername
      );
    });

    if (!matchedUser) {
      const err = "اسم المستخدم أو البريد الإلكتروني غير موجود في نظام إدارة المستخدمين (RBAC).";
      setLoginError(err);
      storage.logAction(cleanUsername, "تسجيل دخول - اسم مستخدم غير معروف", "المصادقة والمستخدمين", "", `محاولة استخدام اسم غير مسجل: ${cleanUsername}`, {
        userId: "unknown",
        userName: cleanUsername,
        result: "denied",
        entityType: "المصادقة",
      });
      return;
    }

    // 2. Validate Password strictly and Auto-Migrate
    const verification = await verifyPassword(cleanPassword, matchedUser);
    
    if (!verification.isValid) {
      const err = "كلمة المرور غير صحيحة. يرجى التأكد وإعادة المحاولة.";
      setLoginError(err);
      storage.logAction(matchedUser.name, "تسجيل دخول - كلمة مرور خاطئة", "المصادقة والمستخدمين", matchedUser.id, `محاولة فاشلة للحساب (${matchedUser.username || matchedUser.email})`, {
        userId: matchedUser.id,
        userName: matchedUser.name,
        userRole: matchedUser.role,
        result: "denied",
        entityType: "المصادقة",
        entityId: matchedUser.id,
      });
      return;
    }

    let activeUser = matchedUser;
    if (verification.needsMigration && verification.updatedUser) {
      activeUser = verification.updatedUser;
      storage.saveUser(activeUser);
    }

    // 3. Check Account Status
    if (matchedUser.status && matchedUser.status !== "active") {
      const err = "حساب المستخدم هذا معطل حالياً. يرجى التواصل مع مسؤول النظام لتفعيله.";
      setLoginError(err);
      storage.logAction(matchedUser.name, "تسجيل دخول - حساب معطل", "المصادقة والمستخدمين", matchedUser.id, `محاولة دخول لحساب معطل (${matchedUser.username || matchedUser.email})`, {
        userId: matchedUser.id,
        userName: matchedUser.name,
        userRole: matchedUser.role,
        result: "denied",
        entityType: "المصادقة",
        entityId: matchedUser.id,
      });
      return;
    }

    // 4. Update lastLoginAt
    activeUser.lastLoginAt = new Date().toISOString().replace("T", " ").substring(0, 19);
    storage.saveUser(activeUser);

    // 5. Audit Log Success
    storage.logAction(activeUser.name, "تسجيل دخول ناجح", "المصادقة والمستخدمين", activeUser.id, `دخول ناجح بدور (${activeUser.role})`, {
      userId: activeUser.id,
      userName: activeUser.name,
      userRole: activeUser.role,
      result: "success",
      entityType: "المصادقة",
      entityId: activeUser.id,
    });

    // 6. Handle Remember Me state
    if (rememberMe) {
      localStorage.setItem("rememberMe", "true");
      localStorage.setItem(
        "rememberedUsername",
        activeUser.username || activeUser.email,
      );
    } else {
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedUsername");
    }

    // 7. Successful Login
    storage.setCurrentUser(activeUser);
    onLogin(rememberMe, activeUser);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden text-slate-900"
      dir="rtl"
    >
      {/* Background Animated Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[15%] left-[20%] animate-[bounce_12s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-6xl">∫</span>
        </div>
        <div className="absolute top-[30%] right-[25%] animate-[bounce_15s_ease-in-out_infinite_reverse]">
          <span className="text-blue-200/40 font-serif text-5xl">π</span>
        </div>
        <div className="absolute bottom-[20%] left-[30%] animate-[bounce_10s_ease-in-out_infinite]">
          <span className="text-blue-200/40 font-serif text-7xl">∑</span>
        </div>
        <div className="absolute top-[20%] right-[15%] animate-[pulse_8s_ease-in-out_infinite]">
          <Atom className="w-20 h-20 text-blue-200/40" strokeWidth={1} />
        </div>
        <div className="absolute bottom-[25%] right-[20%] animate-[spin_20s_linear_infinite]">
          <Settings className="w-16 h-16 text-blue-200/40" strokeWidth={1} />
        </div>
        <div className="absolute top-[45%] left-[10%] animate-[pulse_10s_ease-in-out_infinite]">
          <GraduationCap
            className="w-24 h-24 text-blue-200/40"
            strokeWidth={1}
          />
        </div>
        <div className="absolute bottom-[35%] left-[15%] animate-[bounce_14s_ease-in-out_infinite]">
          <Atom className="w-12 h-12 text-blue-200/40" strokeWidth={1.5} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md px-6">
        {/* White Card */}
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:px-10 flex flex-col items-center justify-center transform transition-all duration-1000 animate-in zoom-in-95 fade-in">
          {/* Logo & Headers */}
          <div className="flex flex-col items-center gap-2 mb-6 w-full text-center">
            <div className="relative flex items-center justify-center mb-1">
              <div className="relative text-blue-600 flex items-center justify-center">
                <BookOpen className="w-14 h-14" strokeWidth={1.5} />
                <Feather
                  className="w-7 h-7 absolute -left-2 top-0"
                  strokeWidth={1.5}
                />
                <Atom
                  className="w-9 h-9 absolute -right-3 -top-2"
                  strokeWidth={2}
                />
              </div>
            </div>

            <h1
              className="text-3xl font-black text-blue-600 tracking-tight"
              dir="ltr"
              style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
            >
              EduTech
            </h1>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              إيدوتيك
            </h2>
            <p className="text-xs md:text-sm font-bold text-slate-600 tracking-wide">
              نظام إدارة المنهاج والاختبارات الذكي
            </p>
          </div>

          {/* Quick Account Selector */}
          {users.length > 0 && (
            <div className="w-full mb-5">
              <label className="block text-xs font-bold text-slate-500 mb-2">
                اختر حساب للتسجيل السريع:
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                {users.map((u) => {
                  const isSelected = u.id === selectedUserId;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleSelectUser(u.id)}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between border transition-all ${
                        isSelected
                          ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                          : "bg-slate-50 border-slate-200/80 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black shrink-0">
                          {u.name.substring(0, 1)}
                        </div>
                        <span className="truncate">{u.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-normal shrink-0">
                          {u.role === "admin"
                            ? "مدير"
                            : u.role === "supervisor"
                              ? "مشرف"
                              : "معلم"}
                        </span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="space-y-3">
              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <UserIcon className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm shadow-sm"
                  placeholder="اسم المستخدم أو البريد"
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 right-0 pl-3 flex items-center pr-3 pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pr-10 pl-3 py-2.5 border border-slate-200 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl transition-all font-medium text-slate-900 placeholder:text-slate-400 text-sm shadow-sm"
                  placeholder="كلمة المرور"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between px-1 py-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <span>تذكر بيانات الدخول</span>
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                (الافتراضية: password123)
              </span>
            </div>

            {loginError && (
              <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 py-1.5 px-3 rounded-lg border border-rose-100">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 text-sm"
            >
              <span>تسجيل الدخول</span>
            </button>

            <div className="flex items-center justify-center gap-4 mt-3 pt-1 text-xs font-bold">
              <a
                href="#"
                className="text-slate-500 hover:text-blue-600 transition-colors"
              >
                نسيت كلمة المرور؟
              </a>
              <span className="text-slate-300">|</span>
              <a
                href="#"
                className="text-slate-600 hover:text-blue-600 transition-colors"
              >
                طلب تفعيل الحساب
              </a>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 flex flex-col items-center text-center space-y-0.5 animate-in fade-in duration-1000 delay-500 fill-mode-both">
        <p className="text-slate-500 text-xs font-medium tracking-wide">
          للمساعدة في التفعيل، تواصل عبر:{" "}
          <span className="font-sans" dir="ltr">
            hanndassh@gmail.com
          </span>
        </p>
        <p className="text-slate-400 text-[11px]">
          النسخة 1.0 (Beta) — إشراف المهندس مثنى رمضان
        </p>
      </div>
    </div>
  );
};
