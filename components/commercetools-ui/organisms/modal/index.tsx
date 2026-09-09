"use client";
import { FC, useEffect } from 'react';
import { XMarkIcon as CloseIcon } from '@heroicons/react/24/solid';
import ReactModal, { Props as ReactModalProps } from 'react-modal';
import useMediaQuery from '@/lib/launchpad/helpers/hooks/useMediaQuery/index';
//import useScrollBlock from 'helpers/hooks/useScrollBlock';
import { desktop } from '@/lib/launchpad/helpers/utils/screensizes/index';

export interface ModalProps extends ReactModalProps {
  closeButton?: boolean;
}

const Modal: FC<ModalProps> = ({ children, style, preventScroll, closeButton, className = '', ...props }) => {
  const [isDesktopSize] = useMediaQuery(desktop);

  //const { blockScroll } = useScrollBlock();

  const modalStyle: ReactModalProps['style'] = {
    overlay: {
      zIndex: 1200,
      backgroundColor: 'rgba(127 ,127, 127, .3)',
      ...style?.overlay,
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      transform: 'translate(-50%, -50%)',
      maxWidth: isDesktopSize ? 800 : '100%',
      position: 'relative',
      padding: 0,
      outline: 'none',
      ...style?.content,
    },
  };

  useEffect(() => {
    if (!preventScroll || !props.isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [props.isOpen, preventScroll]);

  return (
    <ReactModal
      {...props}
      ariaHideApp={false}
      style={modalStyle}
      preventScroll={preventScroll}
      className={`${className} relative overflow-hidden rounded-lg bg-white`}
      parentSelector={() => document.getElementById('react-modal-custom-portal') ?? document.body}
    >
      {closeButton && (
        <button type="button" aria-label="Close dialog" onClick={props.onRequestClose} className="absolute right-20 top-20 focus:ring-1">
          <CloseIcon className="size-24 text-gray-600" />
        </button>
      )}
      {children}
    </ReactModal>
  );
};

export default Modal;
