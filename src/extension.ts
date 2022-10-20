import "source-map-support/register";

import { getApplicationId } from "./helpers/getApplicationId";
import { commands, ExtensionContext, window } from "vscode";
import { RPCController } from "./controller";
import { CONFIG_KEYS } from "./constants";
import { getConfig } from "./config";
import { logInfo } from "./logger";

const controller = new RPCController(getApplicationId(getConfig()).clientId);

export const registerCommands = (ctx: ExtensionContext) => {
    const config = getConfig();

    const enable = async (update = true) => {
        if (update)
            try {
                await config.update(CONFIG_KEYS.Enabled, true);
            } catch (ignored) {}

        controller.statusBarIcon.text = "$(search-refresh) Connecting to Discord Gateway...";
        controller.statusBarIcon.tooltip = "Connecting to Discord Gateway...";
        await controller.enable();
    };

    const disable = async (update = true) => {
        if (update)
            try {
                await config.update(CONFIG_KEYS.Enabled, false);
            } catch (ignored) {}

        controller.cleanUp();
        await controller.disable();

        logInfo(`[003] Destroyed Discord RPC client`);
        controller.statusBarIcon.hide();
    };

    const enableCommand = commands.registerCommand("rpc.enable", async () => {
        await disable(false);
        await enable(false);

        logInfo("Enabled Discord Rich Presence.");

        if (!config[CONFIG_KEYS.SuppressNotifications])
            await window.showInformationMessage("Enabled Discord Rich Presence.");
    });

    const disableCommand = commands.registerCommand("rpc.disable", async () => {
        await disable(false);

        logInfo("Disabled Discord Rich Presence.");

        if (!config[CONFIG_KEYS.SuppressNotifications])
            await window.showInformationMessage("Disabled Discord Rich Presence.");
    });

    const enableWorkspaceCommand = commands.registerCommand("rpc.enableWorkspace", async () => {
        await disable();
        await enable();

        logInfo("Enabled Discord Rich Presence for this workspace.");

        if (!config[CONFIG_KEYS.SuppressNotifications])
            await window.showInformationMessage("Enabled Discord Rich Presence for this workspace.");
    });

    const disableWorkspaceCommand = commands.registerCommand("rpc.disableWorkspace", async () => {
        await disable();

        logInfo("Disabled Discord Rich Presence for this workspace.");

        if (!config[CONFIG_KEYS.SuppressNotifications])
            await window.showInformationMessage("Disabled Discord Rich Presence for this workspace.");
    });

    const reconnectCommand = commands.registerCommand("rpc.reconnect", async () => {
        logInfo("Reconnecting to Discord Gateway...");

        await controller.login();
        await controller.enable();
    });

    const disconnectCommand = commands.registerCommand("rpc.disconnect", async () => {
        logInfo("Disconnecting from Discord Gateway...");

        await controller.destroy();

        controller.statusBarIcon.text = "$(search-refresh) Reconnect to Discord Gateway";
        controller.statusBarIcon.command = "rpc.reconnect";
        controller.statusBarIcon.tooltip = "Reconnect to Discord Gateway";
        controller.statusBarIcon.show();
    });

    ctx.subscriptions.push(
        enableCommand,
        disableCommand,
        enableWorkspaceCommand,
        disableWorkspaceCommand,
        reconnectCommand,
        disconnectCommand
    );

    logInfo("Registered Discord Rich Presence commands");
};

export async function activate(ctx: ExtensionContext) {
    logInfo("Discord Rich Presence for VS Code activated.");
    registerCommands(ctx);

    if (!getConfig()[CONFIG_KEYS.Enabled]) await controller.disable();
}

export async function deactivate() {
    logInfo("Discord Rich Presence for VS Code deactivated.");
    await controller.destroy();
    logInfo(`[004] Destroyed Discord RPC client`);
}
