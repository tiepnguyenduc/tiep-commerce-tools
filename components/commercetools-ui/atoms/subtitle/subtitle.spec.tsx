import { render, screen } from '@/lib/launchpad/__test__/utils/index';
import Subtitle from '@/components/commercetools-ui/atoms/subtitle/index';

describe('[Component] Subtitle', () => {
  it('Renders correctly', () => {
    // eslint-disable-next-line tailwindcss/no-custom-classname
    render(<Subtitle subtitle="Subtitle!" className="custom-class" />);

    expect(screen.queryByText('Subtitle!')).toBeInTheDocument();
    expect(screen.getByText('Subtitle!')).toHaveClass('custom-class');
  });

  it('Applies correct variant', () => {
    const result = render(<Subtitle subtitle="Subtitle!" variant="sm" />);

    expect(screen.getByText('Subtitle!')).toHaveClass('text-12', 'lg:text-14');

    result.rerender(<Subtitle subtitle="Subtitle!" variant="lg" />);

    expect(screen.getByText('Subtitle!')).toHaveClass('text-14', 'lg:text-16');
  });
});
