import DeliveryV2Router from './DeliveryV2Router';
import { DeliveryNotificationProvider } from '@food/context/DeliveryNotificationContext';
import './deliveryTheme.css';

function DeliveryV2Module() {
	return (
		<DeliveryNotificationProvider>
			<div className="delivery-v2-theme">
				<DeliveryV2Router />
			</div>
		</DeliveryNotificationProvider>
	);
}

export default DeliveryV2Module;
