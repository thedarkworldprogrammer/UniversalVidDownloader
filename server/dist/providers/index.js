"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ytdlpProvider = exports.YtDlpProvider = exports.BaseProvider = exports.providerRegistry = void 0;
exports.initializeProviders = initializeProviders;
const registry_1 = require("./registry");
const ytdlp_1 = require("./ytdlp");
/**
 * Initialize all providers
 */
function initializeProviders() {
    registry_1.providerRegistry.register(ytdlp_1.ytdlpProvider);
    // Add more providers here as they are implemented
    // providerRegistry.register(vimeoProvider);
    // providerRegistry.register(twitchProvider);
    // etc.
    console.log(`Initialized ${registry_1.providerRegistry.size()} provider(s)`);
}
var registry_2 = require("./registry");
Object.defineProperty(exports, "providerRegistry", { enumerable: true, get: function () { return registry_2.providerRegistry; } });
var base_1 = require("./base");
Object.defineProperty(exports, "BaseProvider", { enumerable: true, get: function () { return base_1.BaseProvider; } });
var ytdlp_2 = require("./ytdlp");
Object.defineProperty(exports, "YtDlpProvider", { enumerable: true, get: function () { return ytdlp_2.YtDlpProvider; } });
Object.defineProperty(exports, "ytdlpProvider", { enumerable: true, get: function () { return ytdlp_2.ytdlpProvider; } });
//# sourceMappingURL=index.js.map