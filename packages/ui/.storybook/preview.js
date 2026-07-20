import '../../../apps/docs/app/globals.css';

/** @type {import('@storybook/react').Preview} */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'centered',
    backgrounds: {
      default: 'docs',
      values: [
        { name: 'docs', value: '#fafafa' },
        { name: 'white', value: '#ffffff' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen w-full p-6 font-sans text-brand-dark">
        <Story />
      </div>
    ),
  ],
};

export default preview;
