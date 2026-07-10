"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = __importDefault(require("./app"));
const port = process.env.PORT || 3001;
if (require.main === module) {
    app_1.default.listen(port, (error) => {
        if (error) {
            console.error(`Unable to start the API on port ${port}:`, error.message);
            process.exitCode = 1;
            return;
        }
        console.log(`Server running at http://localhost:${port}`);
    });
}
exports.default = app_1.default;
