"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeUserSelect = void 0;
exports.sanitizeUser = sanitizeUser;
exports.safeUserSelect = {
    id: true,
    email: true,
    name: true,
    phone: true,
    photoUrl: true,
    role: true,
    emailVerified: true,
    createdAt: true,
    updatedAt: true,
};
function sanitizeUser(user) {
    const { password: _password, verificationToken: _verificationToken, verificationTokenExpires: _verificationTokenExpires, resetPasswordToken: _resetPasswordToken, resetPasswordExpires: _resetPasswordExpires } = user, safeUser = __rest(user, ["password", "verificationToken", "verificationTokenExpires", "resetPasswordToken", "resetPasswordExpires"]);
    return safeUser;
}
