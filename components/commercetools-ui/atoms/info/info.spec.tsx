import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@/lib/launchpad/__test__/utils/index';
import Info from '@/components/commercetools-ui/atoms/info/index';

describe('[Component] Info', () => {
  test('It renders and toggles correctly', async () => {
    render(<Info message="Hello!" />);

    expect(screen.queryByText('Hello!')).toBeNull();

    await act(async () => await userEvent.hover(screen.getByTestId('info-icon')));

    expect(screen.queryByText('Hello!')).toBeVisible();
  });
});
