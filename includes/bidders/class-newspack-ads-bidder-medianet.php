<?php
/**
 * Newspack Ads Bidder - Media.net
 *
 * The required Prebid.js modules for Media.net are included in the Newspack
 * Ads plugin. For additional partners you must recompile Prebid.js and replace
 * the `newspack-ads-prebid` enqueued script.
 *
 * See Newspack_Ads_Bidding::enqueue_scripts() and 
 * `newspack-ads/src/prebid/index.js` for additional reference.
 *
 * More information on Prebid.js: https://github.com/prebid/Prebid.js/
 *
 * @package Newspack
 */

defined( 'ABSPATH' ) || exit;

/**
 * Newspack Ads Bidder Media.net Class.
 */
class Newspack_Ads_Bidder_Medianet {

	/**
	 * Register bidder and its hooks.
	 */
	public static function init() {
		newspack_register_ads_bidder(
			'medianet',
			array(
				'name'       => 'Media.net',
				'active_key' => 'medianet_cid',
				'settings'   => array(
					array(
						'description' => __( 'Media.net Customer ID', 'newspack-ads' ),
						'help'        => __( 'Your customer ID provided by Media.net', 'newspack-ads' ),
						'key'         => 'medianet_cid',
						'type'        => 'string',
					),
				),
			) 
		);
		add_filter( 'newspack_ads_prebid_config', [ __CLASS__, 'add_realtime_data_config' ] );
		add_filter( 'newspack_ads_medianet_ad_unit_bid', [ __CLASS__, 'set_medianet_ad_unit_bid' ], 10, 4 );
	}

	/**
	 * Add the realtime data config for Media.net.
	 *
	 * @param array $config Prebid.js config.
	 *
	 * @return array
	 */
	public static function add_realtime_data_config( $config ) {
		$bidder_config = newspack_get_ads_bidder( 'medianet' );
		if ( ! isset( $bidder_config['data']['medianet_cid'] ) && ! empty( $bidder_config['data']['medianet_cid'] ) ) {
			return $config;
		}
		$config['realtimeData']['dataProvider'][] = array(
			'name'   => 'medianet',
			'params' => array(
				'cid' => $bidder_config['data']['medianet_cid'],
			),
		);
		return $config;
	}

	/**
	 * Set Media.net bid configuration for an ad unit.
	 *
	 * Assumes bidder configuration exists, e.g. `medianet_cid`, since a bid
	 * shouldn't be available otherwise.
	 *
	 * @param array|null $bid                 The bid.
	 * @param array      $bidder              Bidder configuration.
	 * @param string     $bidder_placement_id The bidder placement ID for this ad unit.
	 * @param array      $data                Ad unit data.
	 *
	 * @return array The bid.
	 */
	public static function set_medianet_ad_unit_bid( $bid, $bidder, $bidder_placement_id, $data ) {
		return [
			'bidder' => 'medianet',
			'params' => [
				'cid'  => $bidder['data']['medianet_cid'],
				'crid' => $bidder_placement_id,
			],
		];
	}
}
Newspack_Ads_Bidder_Medianet::init();
