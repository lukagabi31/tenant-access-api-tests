import { test as base, expect, type Page } from '@playwright/test';

export type Account = { username: string; password: string };

export const ACCOUNTS = {
  acmeAdmin: { username: 'alice', password: 'alice-pass' },
  acmeMember: { username: 'bob', password: 'bob-pass' },
} satisfies Record<string, Account>;

/** Page object for the projects screen. Tests talk to it, not to selectors. */
export class ProjectsPage {
  constructor(private readonly page: Page) {}

  readonly list = () => this.page.getByRole('list', { name: 'Projects' });
  readonly items = () => this.list().getByRole('listitem');
  readonly names = () => this.list().getByTestId('project-name');
  readonly alert = () => this.page.getByRole('alert');
  readonly loading = () => this.page.getByText('Loading projects…');
  readonly empty = () => this.page.getByText('No projects yet.');
  readonly deleteButton = (name: string) => this.page.getByRole('button', { name: `Delete ${name}` });

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async signIn(account: Account): Promise<void> {
    await this.page.getByLabel('Username').fill(account.username);
    await this.page.getByLabel('Password').fill(account.password);
    await this.page.getByRole('button', { name: 'Sign in' }).click();
  }
}

type Fixtures = { projectsPage: ProjectsPage };

/**
 * Every test gets fresh seed data and a ready page object,
 * so a new test only describes behaviour.
 */
export const test = base.extend<Fixtures>({
  projectsPage: async ({ page, request }, use) => {
    const reset = await request.post('/__test/reset');
    expect(reset.status()).toBe(204);
    const projectsPage = new ProjectsPage(page);
    await projectsPage.open();
    await use(projectsPage);
  },
});

export { expect };
