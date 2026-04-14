import { BasePage } from './BasePage.js';

export class AdminPage extends BasePage {
  constructor(page) {
    super(page);
    this.path = '/admin/users';

    // Users section
    this.userSearch = page.locator('#user-search');
    this.roleFilter = page.locator('#role-filter');
    this.refreshUsersButton = page.locator('#refresh-users');
    this.usersContainer = page.locator('#users-container');

    // Bulk actions
    this.bulkRoleSelect = page.locator('#bulk-role-select');
    this.applyBulkRoleButton = page.locator('#apply-bulk-role');
    this.deleteSelectedButton = page.locator('#delete-selected');

    // Roles section
    this.createRoleForm = page.locator('#create-role-form');
    this.roleName = page.locator('#role-name');
    this.roleDescription = page.locator('#role-description');
    this.permissionsList = page.locator('#permissions-list');
    this.rolesList = page.locator('#roles-list');
    this.roleMessages = page.locator('#role-messages');

    // System section
    this.aiLogCutoffSelect = page.locator('#ai-log-cutoff');
    this.saveCutoffButton = page.locator('#save-ai-log-cutoff');
    this.systemMessages = page.locator('#system-messages');

    // Collapsible sections
    this.usersSection = page.locator('#users-section');
    this.rolesSection = page.locator('#roles-section');
    this.systemSection = page.locator('#system-section');
  }

  async waitForReady() {
    await this.usersContainer.waitFor({ state: 'attached' });
  }

  /** Search users by query. */
  async searchUsers(query) {
    await this.userSearch.fill(query);
    // Search usually triggers on input event
    await this.page.waitForTimeout(300);
  }

  /** Filter users by role. */
  async filterByRole(role) {
    await this.roleFilter.selectOption(role);
    await this.page.waitForLoadState('networkidle');
  }

  /** Click the refresh users button. */
  async refreshUsers() {
    await this.refreshUsersButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Create a new role. */
  async createRole(name, description) {
    await this.roleName.fill(name);
    await this.roleDescription.fill(description);
    await this.createRoleForm.locator('button[type="submit"]').click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Set the AI log cutoff value. */
  async setAiLogCutoff(value) {
    await this.aiLogCutoffSelect.selectOption(value);
    await this.saveCutoffButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /** Toggle a collapsible section by name (users, roles, system). */
  async toggleSection(sectionName) {
    await this.page
      .locator(`.collapsible-section[data-section="${sectionName}"] .collapse-toggle`)
      .click();
  }

  /** Check if the users section is visible. */
  async isUsersSectionVisible() {
    return this.usersSection.isVisible();
  }

  /** Check if the roles section is visible. */
  async isRolesSectionVisible() {
    return this.rolesSection.isVisible();
  }

  /** Check if the system section is visible. */
  async isSystemSectionVisible() {
    return this.systemSection.isVisible();
  }

  /** Get the role messages feedback text. */
  async getRoleMessageText() {
    return this.roleMessages.textContent();
  }

  /** Get system messages feedback text. */
  async getSystemMessageText() {
    return this.systemMessages.textContent();
  }
}
