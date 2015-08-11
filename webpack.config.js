var ExtractTextPlugin = require('extract-text-webpack-plugin');
var LessPluginNpmImport = require('less-plugin-npm-import');
var path = require('path');

module.exports = {
	context : __dirname + '/src',
	entry : './index.js',
	output : {
		path : __dirname + '/out/',
		filename : 'mm-image-cropper.bundle.js'
	},
	module: {
		noParse : [
			/\.min\.js$/
		],
		loaders: [
			{
				test: /\.js$/,
				loader: "babel",
				exclude : /node_modules/,
				query: {
					optional : ['runtime', 'spec.protoToAssign']
				}
			},
			{
				test : /node_modules\/.*\.js$/,
				loader : "source-map-loader"
			},
			{
				test: /\.less$/,
				loader: ExtractTextPlugin.extract("style-loader", "css-loader!less-loader")
			},
			{
				test: /\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				loader: "file?name=fonts/[name]-[md5:hash:base64:8].[ext]"
			},
			{
				test: /\.(png|jpg|gif)$/,
				loader : "file?name=imgs/[name]-[md5:hash:base64:8].[ext]"
			},
			{
				test : /\.html$/,
				loader: "html"
			}

		]
	},
	plugins: [
		new ExtractTextPlugin("styles.css")
	],
	lessLoader : {
		lessPlugins : [
			new LessPluginNpmImport()
		]
	},
	//Note: linked dependencies don't always properly compile
	//with normal source maps. Hence, for dev builds we use the
	//#eval-source-map version, which does seem to work
	devtool : process.env.DEV ? '#eval-source-map' : null,
	resolve: { fallback: path.join(__dirname, "node_modules") },
	resolveLoader: { fallback: path.join(__dirname, "node_modules") },
	node : {
		__dirname : true
	}
};
