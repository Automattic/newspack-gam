/**
 * WordPress dependencies.
 */
import { __ } from '@wordpress/i18n';
import { Fragment, useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

/**
 * Newspack dependencies.
 */
import { Card, Notice, TextControl, SelectControl, Button, ProgressBar } from 'newspack-components';

const { lica_batch_size } = window.newspack_ads_bidding_gam;

const Order = ( { orderId = null, name = '', onCreate, onUnrecoverable, onCancel } ) => {
	const [ inFlight, setInFlight ] = useState( false );
	const [ bidders, setBidders ] = useState( {} );
	const [ error, setError ] = useState( null );
	const [ order, setOrder ] = useState( null );
	const [ unrecoverable, setUnrecoverable ] = useState( null );
	const [ step, setStep ] = useState( 0 );
	const [ totalBatches, setTotalBatches ] = useState( 1 );
	const [ totalSteps, setTotalSteps ] = useState( 4 );
	const [ isLastAttempt, setLastAttempt ] = useState( false );
	const [ config, setConfig ] = useState( {
		orderId,
		name,
		revenueShare: 0,
		bidders: [],
	} );
	const hasIssues = () => {
		return (
			! inFlight &&
			order?.order_id &&
			( ! order?.line_item_ids?.length || totalBatches > ( order?.lica_batch_count || 0 ) )
		);
	};
	const fetchLicaConfig = async id => {
		const licaConfig = await apiFetch( {
			path: `/newspack-ads/v1/bidding/gam/lica_config?id=${ id }`,
		} );
		return licaConfig;
	};
	const getStepName = () => {
		switch ( step ) {
			case 0:
				return '';
			case 1:
				return __( 'Creating Order…', 'newspack-ads' );
			case 2:
				return __( 'Creating Line Items…', 'newspack-ads' );
			default:
				return __( 'Associating Creatives…', 'newspack-ads' );
		}
	};
	useEffect( async () => {
		setInFlight( true );
		try {
			setBidders( await apiFetch( { path: '/newspack-ads/v1/bidders' } ) );
		} catch ( err ) {
			setError( err );
		}
		if ( orderId ) {
			try {
				const data = await apiFetch( {
					path: `/newspack-ads/v1/bidding/gam/order?id=${ orderId }`,
					method: 'GET',
				} );
				setConfig( {
					orderId: data.order_id,
					name: data.order_name,
					revenueShare: data.revenue_share,
					bidders: data.bidders,
				} );
				setOrder( data );
			} catch ( err ) {
				setError( err );
			}
		}
		setInFlight( false );
	}, [] );
	useEffect( () => {
		if ( unrecoverable ) {
			setOrder( null );
		}
	}, [ unrecoverable ] );
	const createType = async ( type, batch = 0 ) => {
		return await apiFetch( {
			path: '/newspack-ads/v1/bidding/gam/create',
			method: 'POST',
			data: {
				id: config?.orderId || null,
				type,
				config: {
					order_name: config?.name,
					revenue_share: config?.revenueShare,
					bidders: config?.bidders,
				},
				batch,
			},
		} );
	};
	const create = async () => {
		setError( null );
		setUnrecoverable( null );
		setInFlight( true );
		let pendingOrder = { ...order };
		try {
			if ( ! pendingOrder || ! pendingOrder.order_id ) {
				setStep( 1 );
				pendingOrder = await createType( 'order' );
				setOrder( pendingOrder );
				setConfig( { ...config, orderId: pendingOrder.order_id } );
			}
			if ( ! pendingOrder?.line_item_ids?.length ) {
				setStep( 2 );
				pendingOrder = await createType( 'line_items' );
				setOrder( pendingOrder );
			}
			const licaConfig = await fetchLicaConfig( pendingOrder.order_id );
			const batches = Math.ceil( licaConfig.length / lica_batch_size );
			setTotalBatches( batches );
			setTotalSteps( 3 + batches );
			const start = pendingOrder?.lica_batch_count || 0;
			if ( batches > start ) {
				for ( let i = start; i < batches; i++ ) {
					const batch = i + 1;
					setStep( 2 + batch );
					pendingOrder = await createType( 'creatives', batch );
					setOrder( pendingOrder );
				}
			}
			setStep( 3 + batches );
			if ( typeof onCreate === 'function' ) {
				await onCreate( pendingOrder );
			}
		} catch ( err ) {
			if ( orderId || isLastAttempt ) {
				// Unrecoverable error.
				// TODO: Should archive the order.
				if ( typeof onUnrecoverable === 'function' ) await onUnrecoverable( config );
				setUnrecoverable( err );
			} else {
				// Make it fail unrecoverably if it fails on next attempt.
				if ( pendingOrder?.order_id ) {
					setLastAttempt( true );
				}
				setError( err );
			}
		} finally {
			setStep( 0 );
			setInFlight( false );
		}
	};
	const stepName = getStepName();
	return (
		<Card noBorder>
			<p>
				{ __(
					'Create the order and line items on your Google Ad Manager network according to the pre-defined price bucket settings.',
					'newspack-ads'
				) }
			</p>
			{ error && error.data?.status !== '404' && <Notice isError noticeText={ error.message } /> }
			{ unrecoverable && (
				<Notice
					isError
					noticeText={ __(
						'We were unable to fix the issues with this order and have archived it. Please create a new order below.',
						'newspack-ads'
					) }
				/>
			) }
			<TextControl
				label={ __( 'Order name', 'newspack-ads' ) }
				disabled={ inFlight || order?.order_name }
				value={ order?.order_name ? order.order_name : config.name }
				onChange={ value =>
					setConfig( {
						...config,
						name: value,
					} )
				}
			/>
			<TextControl
				type="number"
				min="0"
				max="100"
				label={ __( 'Bidder Revenue Share', 'newspack-ads' ) }
				help={ __(
					'This is agreed upon revenue share between you and the bid partner. Input the percentage that goes to the bidder, i.e. 20 for 20%.',
					'newspack-ads'
				) }
				disabled={ inFlight }
				value={ config.revenueShare }
				onChange={ value =>
					setConfig( {
						...config,
						revenueShare: value,
					} )
				}
			/>
			<SelectControl
				label={ __( 'Bidders', 'newspack-ads' ) }
				help={ __(
					'Which bidders to include in this order. Select bidders that all have the same revenue share and make sure to not include the same bidder in more than one header bidding order.',
					'newspack-ads'
				) }
				options={ Object.keys( bidders ).map( bidderKey => ( {
					value: bidderKey,
					label: bidders[ bidderKey ].name,
				} ) ) }
				multiple
				onChange={ value =>
					setConfig( {
						...config,
						bidders: value,
					} )
				}
			/>
			{ hasIssues() && (
				<Notice
					isWarning
					noticeText={ __( "Order exists but it's misconfigured.", 'newspack-ads' ) }
				/>
			) }
			{ step && stepName ? (
				<Fragment>
					<Notice
						isWarning
						noticeText={ __(
							'This may take up to 15 minutes, please do not close the window.',
							'newspack-ads'
						) }
					/>
					<ProgressBar completed={ step } total={ totalSteps } label={ stepName } />
				</Fragment>
			) : null }
			<Card buttonsCard noBorder className="justify-end">
				{ typeof onCancel === 'function' && (
					<Button
						isSecondary
						disabled={ inFlight }
						onClick={ () => {
							onCancel();
						} }
					>
						{ __( 'Cancel', 'newspack-ads' ) }
					</Button>
				) }
				<Button
					isPrimary
					disabled={ ! config.name || inFlight }
					onClick={ () => {
						if ( hasIssues() || ! config.orderId ) {
							create();
						} else {
							// Update
						}
					} }
				>
					{ hasIssues()
						? __( 'Fix issues', 'newspack-ads' )
						: __( 'Create Order', 'newspack-ads' ) }
				</Button>
			</Card>
		</Card>
	);
};

export default Order;
