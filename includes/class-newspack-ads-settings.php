<?php
/**
 * Newspack Ads Settings
 *
 * @package Newspack
 */

defined( 'ABSPATH' ) || exit;

/**
 * Newspack Ads Settings Class.
 */
class Newspack_Ads_Settings {

	const OPTION_KEY_PREFIX = '_newspack_ads_';

	/**
	 * Get the setting key to be used on the options table.
	 *
	 * @param object $setting The setting to retrieve the key from.
	 *
	 * @return string Option key. 
	 */
	private static function get_setting_option_key( $setting ) {
		return self::OPTION_KEY_PREFIX . $setting['section'] . '_' . $setting['key'];
	}

	/**
	 * Retreives list of settings.
	 *
	 * @return array Settings list.
	 */
	public static function get_settings_list() {
		$settings_list = array(
			array(
				'description' => __( 'Lazy loading', 'newspack-ads' ),
				'help'        => __( 'Enables pages to load faster, reduces resource consumption and contention, and improves viewability rate.', 'newspack-ads' ),
				'section'     => 'lazy_load',
				'key'         => 'active',
				'type'        => 'boolean',
				'default'     => true,
				'public'      => true,
			),
			array(
				'description' => __( 'Fetch margin percent', 'newspack-ads' ),
				'help'        => __( 'Minimum distance from the current viewport a slot must be before we fetch the ad as a percentage of viewport size.', 'newspack-ads' ),
				'section'     => 'lazy_load',
				'key'         => 'fetch_margin_percent',
				'type'        => 'int',
				'default'     => 100,
				'public'      => true,
			),
			array(
				'description' => __( 'Render margin percent', 'newspack-ads' ),
				'help'        => __( 'Minimum distance from the current viewport a slot must be before we render an ad.', 'newspack-ads' ),
				'section'     => 'lazy_load',
				'key'         => 'render_margin_percent',
				'type'        => 'int',
				'default'     => 0,
				'public'      => true,
			),
			array(
				'description' => __( 'Mobile scaling', 'newspack-ads' ),
				'help'        => __( 'A multiplier applied to margins on mobile devices. This allows varying margins on mobile vs. desktop.', 'newspack-ads' ),
				'section'     => 'lazy_load',
				'key'         => 'mobile_scaling',
				'type'        => 'float',
				'default'     => 2,
				'public'      => true,
			),
		);

		$settings_list = array_map(
			function ( $item ) {
				$default       = ! empty( $item['default'] ) ? $item['default'] : false;
				$item['value'] = get_option( self::get_setting_option_key( $item ), $default );
				return $item;
			},
			$settings_list
		);

		return apply_filters( 'newspack_ads_settings_list', $settings_list );
	}

	/**
	 * Update a setting from a provided section.
	 *
	 * @param string $section The section to update.
	 * @param string $key     The key to update.
	 * @param mixed  $value   The value to update.
	 *
	 * @return bool|WP_Error Whether the value was updated or error if key does not match settings configuration.
	 */
	private static function update_setting( $section, $key, $value ) {
		$settings_list = self::get_settings_list();
		$config        = array_shift(
			array_filter(
				$settings_list,
				function( $setting ) use ( $section, $key ) {
					return $key === $setting['key'] && $section === $setting['section'];
				} 
			)
		);
		if ( $config ) {
			settype( $value, $config['type'] );
			return update_option( self::get_setting_option_key( $config ), $value );
		} else {
			return new WP_Error( 'newspack_ads_invalid_setting_update', __( 'Invalid setting.', 'newspack-ads' ) );
		}
	}

	/**
	 * Update settings from a specific section.
	 *
	 * @param string $section  The key for the section to update.
	 * @param object $settings The new settings to update.
	 *
	 * @return object All settings.
	 */
	public static function update_section( $section, $settings ) {
		foreach ( $settings as $key => $value ) {
			$updated = self::update_setting( $section, $key, $value );
			if ( is_wp_error( $updated ) ) {
				return $updated;
			}
		}
		return self::get_settings_list();
	}

	/**
	 * Get settings values organized by sections.
	 *
	 * @param boolean $is_public Whether to return only public settings.
	 *
	 * @return object Associative array containing settings values.
	 */
	public static function get_settings( $is_public = false ) {
		$list   = self::get_settings_list();
		$values = [];
		foreach ( $list as $setting ) {
			if ( ! isset( $values[ $setting['section'] ] ) ) {
				$values[ $setting['section'] ] = [];
			}
			if ( true === $is_public && true !== $setting['public'] ) {
				continue;
			}
			settype( $setting['value'], $setting['type'] );
			$values[ $setting['section'] ][ $setting['key'] ] = $setting['value'];
		}
		return $values;
	}

}
