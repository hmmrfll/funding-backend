const fs = require('fs');
const path = require('path');

class TemplateEngine {
	constructor(templatesPath) {
		this.templatesPath = templatesPath;
		this.templatesCache = new Map();
	}

	loadTemplate(templateName) {
		if (this.templatesCache.has(templateName)) {
			return this.templatesCache.get(templateName);
		}

		const templatePath = path.join(this.templatesPath, `${templateName}.md`);

		if (!fs.existsSync(templatePath)) {
			throw new Error(`Template not found: ${templateName}`);
		}

		const template = fs.readFileSync(templatePath, 'utf8');
		this.templatesCache.set(templateName, template);

		return template;
	}

	render(templateName, data) {
		let template = this.loadTemplate(templateName);

		for (const [key, value] of Object.entries(data)) {
			const placeholder = `{{${key}}}`;
			template = template.replace(new RegExp(placeholder, 'g'), value || '');
		}

		return template;
	}

	clearCache() {
		this.templatesCache.clear();
	}
}

module.exports = TemplateEngine;
