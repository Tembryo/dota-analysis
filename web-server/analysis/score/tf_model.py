import tensorflow as tf
import numpy as np

flags = tf.app.flags
FLAGS = flags.FLAGS
flags.DEFINE_string('name', "wisdota-model", 'Number of steps to run trainer.')
flags.DEFINE_float('learning_rate', 0.001, 'Initial learning rate.')

hero_code_length  = 10

def build_prediction_graph(concatenated, n_layer, name):
    #input
    mixed1 = nn_layer(concatenated, n_layer, 60, name+'/mixed1')
    mixed2 = nn_layer(mixed1, 60, 50, name+'/mixed2')
    mixed3 = nn_layer(mixed2, 50, 40, name+'/mixed3')
    mixed4 = nn_layer(mixed3, 40, 30, name+'/mixed4')
    mixed5 = nn_layer(mixed4, 30, 20, name+'/mixed5')
    mixed6 = nn_layer(mixed5, 20, 10, name+'/mixed6')

    result = nn_layer(mixed6, 10, 1, name+'/result')
    return result

def build_hero_coder(features_heroes, settings):
    hero1 = nn_layer(features_heroes, settings["n-hero-features"], 30, 'hero1')
    hero2 = nn_layer(hero1, 30, hero_code_length, 'hero2')
    return hero2

def build_feature_subset(features, subset, settings):
    selection_matrix = np.zeros([settings["n-features"],len(subset)], dtype=np.float32)
    for i in xrange(len(subset)):
        selection_matrix[settings["feature-dict"][subset[i]], i] = 1
    selection = tf.constant(selection_matrix)
    selected = tf.matmul(features, selection)
    return selected

def build_outer_product_layer(a, b, size_a, size_b):
    matrix_batch_l = tf.expand_dims(a, 2) # ==> [N, U, 1]
    matrix_batch_r = tf.expand_dims(b, 1) # ==> [N, 1, V]

    result = tf.batch_matmul(matrix_batch_l, matrix_batch_r)
    flattened = tf.reshape(result, [-1, size_a*size_b])
    return flattened

def built_cost_graph(prediction, labels, name):
    error = prediction-labels
    variable_summaries(error, name+'/error')

    cost  = tf.reduce_mean(error**2)
    variable_summaries(cost, name+'/cost')

    return cost

def weight_variable(shape):
  initial = tf.truncated_normal(shape, stddev=0.1, dtype=tf.float32)
  return tf.Variable(initial)

def bias_variable(shape):
  initial = tf.constant(0.1, shape=shape, dtype=tf.float32)
  return tf.Variable(initial)

def variable_summaries(var, name, log_values=False):
    """Attach a lot of summaries to a Tensor."""
    with tf.name_scope('summaries'):
        mean = tf.reduce_mean(var)
        tf.scalar_summary('mean/' + name, mean)
        with tf.name_scope('stddev'):
            stddev = tf.sqrt(tf.reduce_sum(tf.square(var - mean)))
        tf.scalar_summary('sttdev/' + name, stddev)
        tf.scalar_summary('max/' + name, tf.reduce_max(var))
        tf.scalar_summary('min/' + name, tf.reduce_min(var))
        tf.histogram_summary(name, var)    
        if log_values:
            dimensions = var.get_shape().as_list()
            if not None in dimensions and (len(dimensions)==1 or len(dimensions)==2):
                if len(dimensions) == 1:
                    for i in xrange(dimensions[0]):
                        tf.scalar_summary('value/{}[{}]'.format(name,i), tf.reshape(tf.slice(var, [i], [1]),[]) )
                elif len(dimensions) == 2:         
                    for i in xrange(dimensions[0]):
                        for j in xrange(dimensions[1]):
                            tf.scalar_summary('value/{}[{},{}]'.format(name,i,j), tf.reshape(tf.slice(var, [i,j], [1,1]),[]) )

def nn_layer(input_tensor, input_dim, output_dim, layer_name, act=tf.nn.relu):
    """Reusable code for making a simple neural net layer.

    It does a matrix multiply, bias add, and then uses relu to nonlinearize.
    It also sets up name scoping so that the resultant graph is easy to read, and
    adds a number of summary ops.
    """
    # Adding a name scope ensures logical grouping of the layers in the graph.
    with tf.name_scope(layer_name):
      # This Variable will hold the state of the weights for the layer
      with tf.name_scope('weights'):
        weights = weight_variable([input_dim, output_dim])
        variable_summaries(weights, layer_name + '/weights')
      with tf.name_scope('biases'):
        biases = bias_variable([output_dim])
        variable_summaries(biases, layer_name + '/biases')
      with tf.name_scope('Wx_plus_b'):
        preactivate = tf.matmul(input_tensor, weights) + biases
        tf.histogram_summary(layer_name + '/pre_activations', preactivate)
      activations = act(preactivate, 'activation')
      tf.histogram_summary(layer_name + '/activations', activations)
      return activations

def build_evaluation(prediction, labels, name):
    error = prediction-labels
    variable_summaries(error, name+'/evaluation-error')

    mean_abs  = tf.reduce_mean(tf.abs(error))
    tf.scalar_summary(name+'/evaluation-mean_abs', mean_abs)

    mean_sqr  = tf.reduce_mean(error**2)
    variable_summaries(mean_sqr, name+'/evaluation-mean_squared')
    
    root_mean_sqr  = tf.sqrt(mean_sqr)
    tf.scalar_summary(name+'/evaluation-root_mean_squared', root_mean_sqr)

    mean_labels = tf.reduce_mean(labels)
    tf.scalar_summary(name+'/evaluation-mean-labels', mean_labels)
    true_squares =  (labels-mean_labels)**2
    total_sum_of_squares = tf.reduce_sum(true_squares, 0)
    tf.scalar_summary(name+'/evaluation-total_sum_of_squares', tf.squeeze(total_sum_of_squares))
    residual_squares = error**2
    sum_residual_squares = tf.reduce_sum(residual_squares, 0) 
    tf.scalar_summary(name+'/evaluation-sum_residual_squares', tf.squeeze(sum_residual_squares))
    r2 = 1- (sum_residual_squares/total_sum_of_squares)
    tf.scalar_summary(name+'/evaluation-R2', tf.squeeze(r2))

    return r2


class Model:
    def __init__(self, settings, logging=True):
        self.settings = settings

        self.general_features = [
            "win",
            "durationMins"]

        self.subsets = {
            "All": [ "GPM",
                    "XPM",
                    "fraction-creeps-lasthit",
                    "fraction-lasthits",
                    "checks-per-minute",
                    "average-check-duration",
                    "time-fraction-visible",
                    "kills",
                    "deaths",
                    "fightsPerMin",
                    "initiation-score",
                    "camera-average-movement",
                    "camera-distance-average",
                    "camera-distance-stdev",
                    "camera-jumps-per-minute",
                    "camera-percent-far",
                    "camera-percent-moving",
                    "camera-percent-self",
                    "lasthits-per-minute",
                    "lasthits-total-contested",
                    "lasthits-contested-percent-lasthit",
                    "lasthits-taken-percent-free",
                    "lasthits-missed-free",
                    "lasthits-percent-taken-against-contest",
                    "tower-damage",
                    "rax-damage"
              ],
            "IMR": ["GPM",
                    "XPM",
                    "checks-per-minute",
                    "average-check-duration",
                    "time-fraction-visible",
                    "kills",
                    "deaths",
                    "fightsPerMin",
                    "initiation-score",
                    "camera-average-movement",
                    "camera-distance-average",
                    "camera-distance-stdev",
                    "camera-jumps-per-minute",
                    "camera-percent-far",
                    "camera-percent-moving",
                    "camera-percent-self",
                    "lasthits-per-minute",
                    "lasthits-total-contested",
                    "lasthits-contested-percent-lasthit",
                    "lasthits-taken-percent-free",
                    "lasthits-missed-free",
                    "lasthits-percent-taken-against-contest",
                    "tower-damage",
                    "rax-damage"],
            "mechanics": ["average-check-duration", "checks-per-minute", "camera-average-movement", "camera-distance-average", "camera-distance-stdev", "camera-jumps-per-minute", "camera-percent-far", "camera-percent-moving", "camera-percent-self"],
            "farming": ["GPM", "XPM", "fraction-lasthits", "lasthits-per-minute", "lasthits-total-contested", "lasthits-contested-percent-lasthit", "lasthits-taken-percent-free", "lasthits-missed-free", "lasthits-percent-taken-against-contest"],
            "fighting": ["initiation-score", "fightsPerMin", "deaths", "kills"],
            "movement": ["time-fraction-visible"],
            "objectives": ["tower-damage", "rax-damage"]
        }
                                

        with tf.name_scope(FLAGS.name):
            self.features = tf.placeholder(tf.float32, shape=[None, settings["n-features"]], name="features")
            self.features_hero = tf.placeholder(tf.float32, shape=[None, settings["n-hero-features"]], name="features_hero")
            self.labels = tf.placeholder(tf.float32, shape=[None, 1], name="labels")

            coded_hero = build_hero_coder(self.features_hero, settings)
            general = build_feature_subset(self.features, self.general_features, self.settings)

            self.computed_results = []
            result_names = []
            collected_costs = []
            self.collected_evaluations = []

            for subset in self.subsets:
                with tf.name_scope(subset):
                    projected = build_feature_subset(self.features, self.subsets[subset], self.settings)

                    merged_features = concatenated = tf.concat(1, [general, projected])
                    merged_features_length = len(self.general_features) + len(self.subsets[subset])
                    hero_feature_combos = build_outer_product_layer(merged_features, self.features_hero, merged_features_length, settings["n-hero-features"])

                    n_concatenated = len(self.general_features) + len(self.subsets[subset]) + hero_code_length + settings["n-hero-features"] + (merged_features_length*settings["n-hero-features"])
                    
                    concatenated = tf.concat(1, [general, projected, coded_hero, self.features_hero, hero_feature_combos])

                    prediction = build_prediction_graph(concatenated, n_concatenated, "prediction_"+subset)
                    cost = built_cost_graph(prediction, self.labels, subset)
                    evaluation = build_evaluation(prediction, self.labels, subset)
                    self.computed_results.append(prediction)
                    self.collected_evaluations.append(evaluation)
                    collected_costs.append(cost)
                    result_names.append(subset)
            #set up prediction, cost and optimisation
            self.prediction = tf.concat(1, self.computed_results, name='merged_results')

            merged_costs = tf.pack(collected_costs, name='merged_costs')
            self.cost = tf.reduce_mean(merged_costs)
            tf.scalar_summary('total_cost', self.cost)
            self.sqrt_cost  = tf.sqrt(self.cost)
            tf.scalar_summary('total_sqrt_cost', self.sqrt_cost)

            self.result_entries = dict([(v, i) for (i, v) in enumerate(result_names)])

            with tf.name_scope('train'):
                self.train_step = tf.train.AdamOptimizer(
                    FLAGS.learning_rate).minimize(self.cost)

            self.summary_op = tf.merge_all_summaries()
            self.saver = tf.train.Saver()

            self.sess = tf.Session()
            init = tf.initialize_all_variables()
            self.sess.run(init)

            # Instantiate a SummaryWriter to output summaries and the Graph.
            self.logging = logging
            if logging:
                self.summary_writer = tf.train.SummaryWriter(settings["logs-dir"], self.sess.graph)
            self.feed_dict = {}

    def load(self, model_filename):
        self.saver.restore(self.sess, model_filename)

    def train(self, batch):
        self.set_data(batch)
        _, cost_value = self.sess.run([self.train_step, self.sqrt_cost],
                       feed_dict=self.feed_dict)


        return cost_value

    def predict(self, batch):
        self.set_data(batch)
        result, = self.sess.run([self.prediction],
                       feed_dict=self.feed_dict)
        return result

    def update_log(self, step):
        if logging:
            summary_str = self.sess.run(self.summary_op, feed_dict=self.feed_dict)
            self.summary_writer.add_summary(summary_str, step)
            self.summary_writer.flush()
        else:
            print "saving was disabled"

    def save(self,step):
        self.saver.save(self.sess, '{}/{}.ckpt'.format(self.settings["logs-dir"], FLAGS.name), global_step=step)


    def set_data(self, batch):
        self.feed_dict = {
            self.features: batch["features"],
            self.features_hero: batch["features_hero"],
            self.labels: batch["labels"]
        }

    def get_feature_gradients(self, batch):
        #tf.gradients(ys, xs, grad_ys=None, name='gradients', colocate_gradients_with_ops=False, gate_gradients=False, aggregation_method=None)
        pass

    def evaluate(self, batch):
        self.set_data(batch)
        r2s = self.sess.run(self.collected_evaluations,
                       feed_dict=self.feed_dict)
        return r2s