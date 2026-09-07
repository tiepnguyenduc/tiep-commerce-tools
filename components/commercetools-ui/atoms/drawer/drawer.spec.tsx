import userEvent from '@testing-library/user-event';
import { act, render, screen } from '@/lib/launchpad/__test__/utils/index';
import Drawer from '@/components/commercetools-ui/atoms/drawer/index';

describe('[Component] Drawer', () => {
  it('Opens and closes correctly', async () => {
    const onClose = jest.fn();

    const result = render(<Drawer isOpen={false}>Hello!</Drawer>);

    expect(screen.queryByText('Hello!')).toBeNull();
    expect(screen.queryByTestId('overlay')).toBeNull();
    expect(document.body.style.overflowY).not.toBe('hidden');

    result.rerender(
      <Drawer isOpen onClose={onClose}>
        Hello!
      </Drawer>,
    );

    expect(screen.queryByText('Hello!')).toBeVisible();
    expect(screen.queryByTestId('overlay')).toBeVisible();
    expect(document.body.style.overflowY).toBe('hidden');

    await act(async () => await userEvent.click(document.body));

    expect(onClose).toHaveBeenCalled();
  });
});
