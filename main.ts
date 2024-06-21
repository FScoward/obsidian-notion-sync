import {
	App,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	requestUrl,
} from "obsidian";

interface ObsidianNotionSyncSettings {
	notionApiToken: string;
	notionPageId: string;
}

const DEFAULT_SETTINGS: ObsidianNotionSyncSettings = {
	notionApiToken: "",
	notionPageId: "",
};

export default class ObsidianNotionSync extends Plugin {
	settings: ObsidianNotionSyncSettings;

	async onload() {
		console.log("Obsidian Notion Syncプラグインをロードしました。");
		await this.loadSettings();

		this.addRibbonIcon("paper-plane", "Sync to Notion", async () => {
			console.log("Notionへの同期を開始します。");
			await this.syncToNotion();
		});

		this.addSettingTab(new ObsidianNotionSyncSettingTab(this.app, this));
	}

	async loadSettings() {
		console.log("設定を読み込んでいます...");
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
		console.log("設定が読み込まれました:", this.settings);
	}

	async saveSettings() {
		console.log("設定を保存しています...");
		await this.saveData(this.settings);
		console.log("設定が保存されました。");
	}

	async syncToNotion() {
		const { notionApiToken, notionPageId } = this.settings;
		if (!notionApiToken || !notionPageId) {
			new Notice("Notion API TokenとPage IDを設定に入力してください。");
			console.error(
				"Notion API TokenまたはPage IDが設定されていません。"
			);
			return;
		}

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("同期するファイルがありません。");
			console.error("同期するファイルがありません。");
			return;
		}

		const content = await this.app.vault.read(activeFile);
		console.log("ファイルの内容を読み込みました:", content);
		await this.sendToNotion(content, notionApiToken, notionPageId);
	}

	async sendToNotion(
		content: string,
		notionApiToken: string,
		notionPageId: string
	) {
		try {
			console.log("Notionに送信しています...");
			const requestBody = JSON.stringify({
				children: [
					{
						object: "block",
						type: "paragraph",
						paragraph: {
							rich_text: [
								{
									type: "text",
									text: {
										content: "これはテストです。", // 簡略化されたコンテンツ
									},
								},
							],
						},
					},
				],
			});

			console.log("リクエストボディ:", requestBody);

			const response = await requestUrl({
				url: `https://api.notion.com/v1/blocks/${notionPageId}/children`,
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${notionApiToken}`,
					"Content-Type": "application/json",
					"Notion-Version": "2022-06-28",
				},
				body: requestBody,
			});

			console.log("レスポンスステータス:", response.status);
			console.log("レスポンスボディ:", response.text);

			const responseBody = JSON.parse(response.text);
			console.log("Notionからのレスポンス:", responseBody);

			// cURLコマンドを生成して表示
			const curlCommand = `curl -X PATCH 'https://api.notion.com/v1/blocks/${notionPageId}/children' \\
-H 'Authorization: Bearer ${notionApiToken}' \\
-H 'Content-Type: application/json' \\
-H 'Notion-Version: 2022-06-28' \\
-d '${requestBody}'`;

			console.log("cURLコマンド:");
			console.log(curlCommand);

			if (response.status !== 200) {
				new Notice(
					`Notionとの同期に失敗しました。理由: ${
						responseBody.message || "不明なエラー"
					}`
				);
				console.error(
					"Notionとの同期に失敗しました。ステータスコード:",
					response.status,
					"レスポンス:",
					responseBody
				);
				return;
			}

			new Notice("Notionと正常に同期されました。");
			console.log("Notionと正常に同期されました。");
		} catch (error) {
			new Notice(`エラーが発生しました: ${error.message}`);
			console.error("エラーが発生しました:", error);
		}
	}
}

class ObsidianNotionSyncSettingTab extends PluginSettingTab {
	plugin: ObsidianNotionSync;

	constructor(app: App, plugin: ObsidianNotionSync) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Obsidian Notion Syncの設定" });

		new Setting(containerEl)
			.setName("Notion API Token")
			.setDesc("Notion APIトークンを入力してください")
			.addText((text) =>
				text
					.setPlaceholder("トークンを入力")
					.setValue(this.plugin.settings.notionApiToken)
					.onChange(async (value) => {
						console.log("Notion API Tokenが変更されました:", value);
						this.plugin.settings.notionApiToken = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Notion Page ID")
			.setDesc("同期するNotionページのIDを入力してください")
			.addText((text) =>
				text
					.setPlaceholder("ページIDを入力")
					.setValue(this.plugin.settings.notionPageId)
					.onChange(async (value) => {
						console.log("Notion Page IDが変更されました:", value);
						this.plugin.settings.notionPageId = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
